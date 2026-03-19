#!/usr/bin/env node

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const summaryPath = path.join(repoRoot, "docs", "context_summary.md");
const ralphStatusPath = path.join(repoRoot, "docs", "ralph_status.md");

function run(command, args = [], options = {}) {
  const pretty = [command, ...args].join(" ");
  console.log(`\n$ ${pretty}`);
  const result = execFileSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });

  if (result?.trim()) {
    console.log(result.trim());
  }

  return result;
}

function runJson(command, args = []) {
  const output = run(command, args);
  return JSON.parse(output || "null");
}

function ensureCleanTree() {
  const ignoredPaths = new Set([
    "AGENTS.md",
    "HEARTBEAT.md",
    "IDENTITY.md",
    "SOUL.md",
    "TOOLS.md",
    "USER.md",
  ]);
  const statusLines = run("git", ["status", "--porcelain"])
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean);
  const relevantChanges = statusLines.filter((line) => {
    const filePath = line.slice(3);
    return !ignoredPaths.has(filePath);
  });

  if (relevantChanges.length > 0) {
    throw new Error(
      "Working tree is not clean. Commit, stash, or discard changes before running Ralph loop.",
    );
  }
}

function ensureBranch(branch) {
  const current = run("git", ["branch", "--show-current"]).trim();
  if (current !== branch) {
    run("git", ["checkout", branch]);
  }

  run("git", ["pull", "--ff-only", "origin", branch]);
}

function getDefaultBranch() {
  const repo = runJson("gh", [
    "repo",
    "view",
    "--json",
    "defaultBranchRef,nameWithOwner",
  ]);

  return {
    repo: repo.nameWithOwner,
    branch: repo.defaultBranchRef.name,
  };
}

function listOpenIssues(repo, limit) {
  return runJson("gh", [
    "issue",
    "list",
    "--repo",
    repo,
    "--state",
    "open",
    "--limit",
    String(limit),
    "--json",
    "number,title,labels,assignees,url",
  ]);
}

function pickIssue(issues) {
  return issues.find(
    (issue) =>
      !issue.labels.some((label) => label.name.toLowerCase() === "blocked"),
  );
}

function branchNameFor(issue) {
  const slug = issue.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `ralph/issue-${issue.number}-${slug}`;
}

function openExistingPr(repo, branch) {
  const prs = runJson("gh", [
    "pr",
    "list",
    "--repo",
    repo,
    "--head",
    branch,
    "--state",
    "open",
    "--json",
    "number,url,title,headRefName,reviewDecision,mergeStateStatus",
  ]);

  return prs[0] ?? null;
}

function createPr(repo, issue, branch, base) {
  const body = [
    "## Summary",
    `- Implements #${issue.number}`,
    "- Prepared by the Ralph loop controller",
    "",
    "## Validation",
    "- [ ] pnpm lint",
    "- [ ] pnpm test",
    "- [ ] pnpm test:e2e",
    "- [ ] pnpm build",
  ].join("\n");

  run("gh", [
    "pr",
    "create",
    "--repo",
    repo,
    "--base",
    base,
    "--head",
    branch,
    "--title",
    `feat: resolve issue #${issue.number} - ${issue.title}`,
    "--body",
    body,
  ]);

  return runJson("gh", [
    "pr",
    "view",
    branch,
    "--repo",
    repo,
    "--json",
    "number,url,title,reviewDecision,mergeStateStatus",
  ]);
}

function getPrDetails(repo, prNumber) {
  return runJson("gh", [
    "pr",
    "view",
    String(prNumber),
    "--repo",
    repo,
    "--json",
    "number,url,title,reviewDecision,mergeStateStatus,state,isDraft,headRefName,baseRefName,reviews",
  ]);
}

function getChecks(repo, prNumber) {
  try {
    return runJson("gh", [
      "pr",
      "checks",
      String(prNumber),
      "--repo",
      repo,
      "--json",
      "name,state,workflow,link",
    ]);
  } catch {
    return [];
  }
}

function getCommitStatuses(repo, sha) {
  return runJson("gh", ["api", `repos/${repo}/commits/${sha}/status`]);
}

function getWorkflowRuns(repo, branch, limit = 10) {
  return runJson("gh", [
    "run",
    "list",
    "--repo",
    repo,
    "--branch",
    branch,
    "--limit",
    String(limit),
    "--json",
    "databaseId,workflowName,status,conclusion,url,headBranch,displayTitle,event,createdAt",
  ]);
}

function deriveCiStatus({ repo, prNumber, branch, sha }) {
  const checkStatuses = {
    pending: new Set(["PENDING", "QUEUED", "IN_PROGRESS", "WAITING"]),
    success: new Set([
      "SUCCESS",
      "SUCCESSFUL",
      "COMPLETED",
      "NEUTRAL",
      "SKIPPED",
    ]),
    failure: new Set([
      "FAILURE",
      "FAILED",
      "ERROR",
      "TIMED_OUT",
      "CANCELLED",
      "STARTUP_FAILURE",
      "ACTION_REQUIRED",
    ]),
  };

  const prChecks = getChecks(repo, prNumber);
  if (prChecks.length > 0) {
    const pending = prChecks.filter((check) =>
      checkStatuses.pending.has(String(check.state).toUpperCase()),
    );
    const failed = prChecks.filter((check) =>
      checkStatuses.failure.has(String(check.state).toUpperCase()),
    );

    if (failed.length > 0) {
      return failed
        .map(
          (check) =>
            `${check.workflow || "workflow"} / ${check.name}: ${check.state.toLowerCase()}`,
        )
        .join("; ");
    }

    if (pending.length > 0) {
      return pending
        .map(
          (check) =>
            `${check.workflow || "workflow"} / ${check.name}: ${check.state.toLowerCase()}`,
        )
        .join("; ");
    }

    return prChecks
      .map(
        (check) =>
          `${check.workflow || "workflow"} / ${check.name}: ${check.state.toLowerCase()}`,
      )
      .join("; ");
  }

  if (sha) {
    try {
      const status = getCommitStatuses(repo, sha);
      if (Array.isArray(status.statuses) && status.statuses.length > 0) {
        return status.statuses
          .map((item) => `${item.context}: ${item.state}`)
          .join("; ");
      }

      if (status.state && status.state !== "pending") {
        return `commit status: ${status.state}`;
      }
    } catch {
      // Fall through to workflow runs.
    }
  }

  const runs = getWorkflowRuns(repo, branch);
  if (!runs.length) {
    return "no CI runs found";
  }

  return runs
    .slice(0, 3)
    .map((run) => {
      const outcome = run.conclusion || run.status;
      return `${run.workflowName}: ${outcome} (${run.url})`;
    })
    .join("; ");
}

function formatIssueLine(issue) {
  if (!issue) {
    return "none";
  }

  return `#${issue.number} - ${issue.title} (${issue.url})`;
}

function formatPrLine(pr) {
  if (!pr) {
    return "none";
  }

  return `#${pr.number} - ${pr.title} (${pr.url})`;
}

function writeRalphStatus({ repo, issue, pr, ciStatus, nextIssue }) {
  const content = [
    "# Ralph Loop Status",
    "",
    `- Repository: ${repo}`,
    `- Generated at: ${new Date().toISOString()}`,
    `- Current issue: ${formatIssueLine(issue)}`,
    `- Current PR: ${formatPrLine(pr)}`,
    `- CI status: ${ciStatus}`,
    `- Next issue: ${formatIssueLine(nextIssue)}`,
    "",
  ].join("\n");

  fs.mkdirSync(path.dirname(ralphStatusPath), { recursive: true });
  fs.writeFileSync(ralphStatusPath, content);
  console.log(`Updated ${path.relative(repoRoot, ralphStatusPath)}`);
}

function updateRalphStatus(
  repo,
  currentIssue = null,
  currentPr = null,
  issueLimit = 20,
) {
  const issues = listOpenIssues(repo, issueLimit);
  const currentIssueNumber = currentIssue?.number ?? null;
  const nextIssue = pickIssue(
    issues.filter((issue) => issue.number !== currentIssueNumber),
  );

  let activePr = currentPr;
  if (!activePr && currentIssueNumber) {
    const prs = runJson("gh", [
      "pr",
      "list",
      "--repo",
      repo,
      "--state",
      "open",
      "--search",
      `${currentIssueNumber} in:title,body`,
      "--json",
      "number,title,url,headRefName",
    ]);
    activePr = prs[0] ?? null;
  }

  const ciStatus = activePr
    ? deriveCiStatus({
        repo,
        prNumber: activePr.number,
        branch: activePr.headRefName,
        sha: null,
      })
    : "no active PR";

  writeRalphStatus({
    repo,
    issue: currentIssue,
    pr: activePr,
    ciStatus,
    nextIssue,
  });
}

function sleep(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function waitForChecks(repo, prNumber, pollSeconds, timeoutMinutes) {
  const deadline = Date.now() + timeoutMinutes * 60_000;

  while (Date.now() < deadline) {
    const checks = getChecks(repo, prNumber);

    if (!checks.length) {
      console.log("No checks reported yet; waiting...");
    } else {
      const pending = checks.filter((check) =>
        ["PENDING", "QUEUED", "IN_PROGRESS", "WAITING"].includes(check.state),
      );
      const failed = checks.filter((check) =>
        [
          "FAILURE",
          "ERROR",
          "TIMED_OUT",
          "CANCELLED",
          "STARTUP_FAILURE",
        ].includes(check.state),
      );

      if (!pending.length && !failed.length) {
        console.log("All PR checks passed.");
        return { ok: true, checks };
      }

      if (failed.length) {
        console.log("Some checks failed:");
        for (const check of failed) {
          console.log(
            `- ${check.workflow || "workflow"} / ${check.name}: ${check.state}`,
          );
        }
        return { ok: false, checks };
      }

      console.log(
        `Checks still running (${pending.length} pending). Waiting ${pollSeconds}s...`,
      );
    }

    sleep(pollSeconds * 1000);
  }

  throw new Error(`Timed out waiting for PR #${prNumber} checks.`);
}

function requestReview(repo, prNumber, reviewer) {
  if (!reviewer) {
    return;
  }

  run("gh", [
    "pr",
    "edit",
    String(prNumber),
    "--repo",
    repo,
    "--add-reviewer",
    reviewer,
  ]);
}

function reviewAndMerge(repo, prNumber, mergeMethod) {
  const pr = getPrDetails(repo, prNumber);

  if (pr.reviewDecision === "CHANGES_REQUESTED") {
    throw new Error(
      `PR #${prNumber} has changes requested. Ralph loop stops here.`,
    );
  }

  if (["", "REVIEW_REQUIRED"].includes(pr.reviewDecision ?? "")) {
    console.log(
      "No approval recorded yet. Attempting self-approval if repository rules allow it.",
    );
    try {
      run("gh", [
        "pr",
        "review",
        String(prNumber),
        "--repo",
        repo,
        "--approve",
        "--body",
        "Automated approval from Ralph loop.",
      ]);
    } catch {
      console.log(
        "Self-approval was not accepted; continuing to merge only if branch protection allows it.",
      );
    }
  }

  const mergeFlag =
    mergeMethod === "rebase"
      ? "--rebase"
      : mergeMethod === "merge"
        ? "--merge"
        : "--squash";

  run("gh", [
    "pr",
    "merge",
    String(prNumber),
    "--repo",
    repo,
    mergeFlag,
    "--delete-branch",
    "--auto",
  ]);
}

function updateContextSummary({ issue, pr, repo, baseBranch }) {
  const timestamp = new Date().toISOString();
  const current = fs.existsSync(summaryPath)
    ? fs.readFileSync(summaryPath, "utf8")
    : "# Context Summary\n\n## Current State\n\n_No merged Ralph loop work has been recorded yet._\n\n## Merged PR History\n";

  const header = "# Context Summary\n\n## Current State\n\n";
  const currentState = [
    `- Last merged at: ${timestamp}`,
    `- Repository: ${repo}`,
    `- Default branch: ${baseBranch}`,
    `- Last completed issue: #${issue.number} — ${issue.title}`,
    `- Last merged PR: #${pr.number} — ${pr.title}`,
    `- PR URL: ${pr.url}`,
  ].join("\n");

  const historyHeader = "\n\n## Merged PR History\n";
  const existingHistory = current.includes("## Merged PR History")
    ? current.split("## Merged PR History")[1].trimStart()
    : "";
  const newEntry = `- ${timestamp}: merged PR #${pr.number} for issue #${issue.number} (${issue.title}) — ${pr.url}`;
  const updated = `${header}${currentState}${historyHeader}${newEntry}${existingHistory ? `\n${existingHistory}` : ""}\n`;

  fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
  fs.writeFileSync(summaryPath, updated);
  console.log(`Updated ${path.relative(repoRoot, summaryPath)}`);
}

function closeIssue(repo, issueNumber) {
  run("gh", [
    "issue",
    "close",
    String(issueNumber),
    "--repo",
    repo,
    "--comment",
    "Completed via merged Ralph loop pull request.",
  ]);
}

function parseArgs(argv) {
  const args = {
    issue: null,
    limit: 20,
    base: null,
    reviewer: process.env.RALPH_REVIEWER || "",
    mergeMethod: process.env.RALPH_MERGE_METHOD || "squash",
    pollSeconds: Number(process.env.RALPH_POLL_SECONDS || 20),
    timeoutMinutes: Number(process.env.RALPH_TIMEOUT_MINUTES || 30),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    switch (token) {
      case "--issue":
        args.issue = Number(argv[++index]);
        break;
      case "--limit":
        args.limit = Number(argv[++index]);
        break;
      case "--base":
        args.base = argv[++index];
        break;
      case "--reviewer":
        args.reviewer = argv[++index];
        break;
      case "--merge":
        args.mergeMethod = argv[++index];
        break;
      case "--poll-seconds":
        args.pollSeconds = Number(argv[++index]);
        break;
      case "--timeout-minutes":
        args.timeoutMinutes = Number(argv[++index]);
        break;
      case "--help":
      case "-h": {
        console.log(
          "Ralph loop\n\nOptions:\n  --issue <number>           Work a specific GitHub issue\n  --limit <n>                Search up to n open issues (default: 20)\n  --base <branch>            Override the default branch\n  --reviewer <login>         Request review from a GitHub user/team\n  --merge <squash|merge|rebase>\n  --poll-seconds <n>         Wait between check polls\n  --timeout-minutes <n>      Max time to wait for CI\n",
        );
        process.exit(0);
        return args;
      }
      default:
        throw new Error(`Unknown argument: ${token}`);
    }
  }

  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  ensureCleanTree();

  const { repo, branch: defaultBranch } = getDefaultBranch();
  const baseBranch = args.base || defaultBranch;
  ensureBranch(baseBranch);

  const issues = listOpenIssues(repo, args.limit);
  const issue = args.issue
    ? issues.find((item) => item.number === args.issue)
    : pickIssue(issues);

  if (!issue) {
    updateRalphStatus(repo, null, null, args.limit);
    console.log("No eligible open issue found. Ralph loop is done for now.");
    return;
  }

  console.log(`Selected issue #${issue.number}: ${issue.title}`);
  const branch = branchNameFor(issue);
  let pr = openExistingPr(repo, branch);

  if (!pr) {
    const localBranches = run("git", ["branch", "--list", branch]).trim();
    if (!localBranches) {
      updateRalphStatus(repo, issue, null, args.limit);
      run("git", ["checkout", "-b", branch]);
      console.log(
        "Branch created. Implement the issue changes, commit them, and push the branch before re-running Ralph loop.",
      );
      console.log(
        `Suggested next commands:\n  git push -u origin ${branch}\n  node scripts/ralph-loop.js --issue ${issue.number}`,
      );
      return;
    }

    run("git", ["checkout", branch]);
    const ahead = run("git", ["status", "--short", "--branch"]);
    if (!ahead.includes("origin/")) {
      updateRalphStatus(repo, issue, null, args.limit);
      console.log(
        `Branch ${branch} exists locally but is not tracking a remote branch yet. Push it first, then re-run Ralph loop.`,
      );
      return;
    }

    pr = createPr(repo, issue, branch, baseBranch);
  }

  updateRalphStatus(repo, issue, pr, args.limit);
  console.log(`Using PR #${pr.number}: ${pr.url}`);
  requestReview(repo, pr.number, args.reviewer);
  const checkResult = waitForChecks(
    repo,
    pr.number,
    args.pollSeconds,
    args.timeoutMinutes,
  );

  if (!checkResult.ok) {
    updateRalphStatus(repo, issue, pr, args.limit);
    process.exitCode = 1;
    return;
  }

  reviewAndMerge(repo, pr.number, args.mergeMethod);
  const mergedPr = getPrDetails(repo, pr.number);
  updateContextSummary({ issue, pr: mergedPr, repo, baseBranch });
  run("git", ["checkout", baseBranch]);
  run("git", ["pull", "--ff-only", "origin", baseBranch]);
  closeIssue(repo, issue.number);

  const nextIssues = listOpenIssues(repo, args.limit);
  const nextIssue = pickIssue(nextIssues);
  writeRalphStatus({
    repo,
    issue,
    pr: mergedPr,
    ciStatus: "merged",
    nextIssue,
  });

  if (nextIssue) {
    console.log(
      `Next issue in queue: #${nextIssue.number} - ${nextIssue.title}`,
    );
  } else {
    console.log("No more open issues remain after this merge.");
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
