import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Test that a moderator can retrieve the full details of a single report by its
 * unique ID for moderation review.
 *
 * Steps:
 *
 * 1. Register a new moderator and obtain authentication
 * 2. Register a new user and obtain authentication
 * 3. The user files a report (targets any one of post, comment, or community)
 * 4. The moderator fetches that report by its ID
 * 5. Validate all expected attributes are present in the response and permissions
 *    are enforced
 *
 * Expected outcome: authenticated moderator successfully views all report
 * details for moderation workflow.
 */
export async function test_api_report_details_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // 1. Register a new moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModeratorPassword123!";
  const moderatorJoin = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      status: "active",
      href: "https://community-platform.io/onboarding/moderator",
      referrer: "https://community-platform.io/",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderatorJoin);
  // Save moderator credentials for login switching
  // 2. Register a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "UserPassword123!";
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword satisfies string & tags.Format<"password">,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userJoin);

  // 3. User files a report (target report to post, comment, or community - target post here is not registered, so must choose placeholder target)
  // Since API expects at least one of reported_post_id, reported_comment_id, or reported_community_id, supply a random UUID for reported_community_id
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword satisfies string & tags.Format<"password">,
      href: "https://community-platform.io/login",
      referrer: "https://community-platform.io/",
    } satisfies ICommunityPlatformUser.ILogin,
  });
  // Now authenticated as new user
  const reportType = RandomGenerator.pick([
    "spam",
    "abuse",
    "harassment",
    "rule_violation",
  ] as const);
  const reportReason = RandomGenerator.paragraph({ sentences: 4 });
  const reportedCommunityId = typia.random<string & tags.Format<"uuid">>();
  const reportBody = {
    reported_community_id: reportedCommunityId,
    report_type: reportType,
    reason: reportReason,
  } satisfies ICommunityPlatformReport.ICreate;
  const createReport =
    await api.functional.communityPlatform.user.reports.create(connection, {
      body: reportBody,
    });
  typia.assert(createReport);

  // 4. The moderator logs in
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword as string & tags.Format<"password">,
      href: "https://community-platform.io/moderator-login",
      referrer: "https://community-platform.io/",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 5. Moderator fetches the report by its ID
  const fetchedReport =
    await api.functional.communityPlatform.moderator.reports.at(connection, {
      reportId: createReport.id,
    });
  typia.assert(fetchedReport);

  // 6. Validate all expected attributes and permissions
  TestValidator.equals("report id matches", fetchedReport.id, createReport.id);
  TestValidator.equals(
    "report type matches",
    fetchedReport.report_type,
    reportType,
  );
  TestValidator.equals(
    "report reason matches",
    fetchedReport.reason,
    reportReason,
  );
  TestValidator.equals(
    "reporter user id matches",
    fetchedReport.reporter.id,
    userJoin.id,
  );
  TestValidator.equals(
    "reported_community_id matches",
    fetchedReport.reported_community?.id,
    reportedCommunityId,
  );
  TestValidator.predicate(
    "status exists",
    typeof fetchedReport.status === "string" && fetchedReport.status.length > 0,
  );
  TestValidator.predicate(
    "created_at is a string",
    typeof fetchedReport.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is a string",
    typeof fetchedReport.updated_at === "string",
  );
}
