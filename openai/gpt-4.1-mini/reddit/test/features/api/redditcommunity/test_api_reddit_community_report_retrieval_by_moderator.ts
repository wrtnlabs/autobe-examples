import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";

export async function test_api_reddit_community_report_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // Authenticate as community moderator to obtain token
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        email: RandomGenerator.pick([
          "mod1@example.com",
          "mod2@example.com",
          "mod3@example.com",
        ] as const),
        password: "StrongPassword123!",
        nickname: RandomGenerator.name(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "authenticated user should have valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      moderator.id,
    ),
  );

  // Prepare a report ID to retrieve
  const reportId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Fetch detailed report information by report ID
  const report: IRedditCommunityReport =
    await api.functional.redditCommunity.communityModerator.redditCommunityReports.at(
      connection,
      { id: reportId },
    );
  typia.assert(report);

  // Validate essential properties
  TestValidator.equals("report ID matches request", report.id, reportId);
  TestValidator.predicate(
    "report reason is non-empty string",
    typeof report.reason === "string" && report.reason.length > 0,
  );
  TestValidator.predicate(
    "report status is non-empty string",
    typeof report.status === "string" && report.status.length > 0,
  );
  TestValidator.predicate(
    "report has valid created_at timestamp",
    typeof report.created_at === "string" && report.created_at.length > 0,
  );
  TestValidator.predicate(
    "report has valid updated_at timestamp",
    typeof report.updated_at === "string" && report.updated_at.length > 0,
  );

  // Confirm that either post ID or comment ID is set (one must be non-null)
  TestValidator.predicate(
    "one of post ID or comment ID must be present",
    (report.reddit_community_posts_id !== null &&
      report.reddit_community_posts_id !== undefined) ||
      (report.reddit_community_comments_id !== null &&
        report.reddit_community_comments_id !== undefined),
  );

  // Validate that deleted_at is either null or a string if present
  TestValidator.predicate(
    "deleted_at is null or string if present",
    report.deleted_at === null ||
      typeof report.deleted_at === "string" ||
      report.deleted_at === undefined,
  );
}
