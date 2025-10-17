import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformEscalationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformEscalationLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformEscalationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformEscalationLog";

/**
 * Validate that when searching escalation logs as a moderator, only logs
 * related to the assigned community are returned, filters (report_id, status)
 * restrict access within scope, and errors are returned when searching outside
 * assignment. Also, validate pagination works and other moderators cannot
 * access logs out of their scope.
 */
export async function test_api_escalation_log_index_moderator_scope_and_permissions(
  connection: api.IConnection,
) {
  // Create a report category (for both communities)
  const reportCategory =
    await api.functional.communityPlatform.admin.reportCategories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          allow_free_text: true,
        },
      },
    );
  typia.assert(reportCategory);

  // Simulate two communities by using different UUIDs
  const communityA = typia.random<string & tags.Format<"uuid">>();
  const communityB = typia.random<string & tags.Format<"uuid">>();

  // Create two moderators, each assigned to a different community
  const emailA = typia.random<string & tags.Format<"email">>();
  const emailB = typia.random<string & tags.Format<"email">>();
  const passwordA = "passwordA123!";
  const passwordB = "passwordB456!";

  // Moderator A joins communityA
  const moderatorA = await api.functional.auth.moderator.join(connection, {
    body: {
      email: emailA,
      password: passwordA,
      community_id: communityA,
    },
  });
  typia.assert(moderatorA);

  // Moderator B joins communityB
  const moderatorB = await api.functional.auth.moderator.join(connection, {
    body: {
      email: emailB,
      password: passwordB,
      community_id: communityB,
    },
  });
  typia.assert(moderatorB);

  // Authenticate as moderatorA
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: emailA,
      password: passwordA,
      community_id: communityA,
    },
  });

  // Create a report (report1) in communityA (as member -- simulate with comment_id null, post_id with random uuid)
  const report1 = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: {
        post_id: typia.random<string & tags.Format<"uuid">>(),
        report_category_id: reportCategory.id,
        reason_text: RandomGenerator.paragraph({ sentences: 4 }),
      },
    },
  );
  typia.assert(report1);

  // Escalate that report as moderatorA
  const logA =
    await api.functional.communityPlatform.moderator.escalationLogs.create(
      connection,
      {
        body: {
          initiator_id: moderatorA.member_id,
          report_id: report1.id,
          escalation_reason: RandomGenerator.paragraph({ sentences: 4 }),
          status: "pending",
        },
      },
    );
  typia.assert(logA);

  // Authenticate as moderatorB
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: emailB,
      password: passwordB,
      community_id: communityB,
    },
  });

  // Moderator B tries searching for logs with report_id for report in communityA (should get zero OR forbidden)
  const logsByBAttempt =
    await api.functional.communityPlatform.moderator.escalationLogs.index(
      connection,
      {
        body: {
          report_id: report1.id,
        },
      },
    );
  typia.assert(logsByBAttempt);
  TestValidator.predicate(
    "moderatorB cannot access escalation logs outside their community",
    logsByBAttempt.data.length === 0,
  );

  // Authenticate back as moderatorA
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: emailA,
      password: passwordA,
      community_id: communityA,
    },
  });

  // ModeratorA fetches escalation logs (should see their own report)
  const logsForA =
    await api.functional.communityPlatform.moderator.escalationLogs.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(logsForA);
  TestValidator.predicate(
    "moderatorA GET returns escalation logs in their assigned community",
    logsForA.data.some(
      (log) => log.id === logA.id && log.report_id === report1.id,
    ),
  );

  // ModeratorA uses filter: report_id
  const logsForAByReport =
    await api.functional.communityPlatform.moderator.escalationLogs.index(
      connection,
      {
        body: { report_id: report1.id },
      },
    );
  typia.assert(logsForAByReport);
  TestValidator.predicate(
    "moderatorA GET with filter report_id returns the log",
    logsForAByReport.data.some((log) => log.id === logA.id),
  );

  // ModeratorA uses filter: status
  const logsForAByStatus =
    await api.functional.communityPlatform.moderator.escalationLogs.index(
      connection,
      {
        body: { status: "pending" },
      },
    );
  typia.assert(logsForAByStatus);
  TestValidator.predicate(
    "moderatorA GET with filter status returns the log",
    logsForAByStatus.data.some((log) => log.id === logA.id),
  );

  // Pagination checks
  const logsPage1 =
    await api.functional.communityPlatform.moderator.escalationLogs.index(
      connection,
      {
        body: { limit: 1, page: 1 },
      },
    );
  typia.assert(logsPage1);
  TestValidator.predicate(
    "pagination limit=1 results in at most one log on page 1",
    logsPage1.data.length <= 1,
  );
}
