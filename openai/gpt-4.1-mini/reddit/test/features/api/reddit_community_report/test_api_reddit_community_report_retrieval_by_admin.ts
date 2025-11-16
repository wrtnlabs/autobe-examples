import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";

export async function test_api_reddit_community_report_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins and authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "testPassword123";
  const adminCreateBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies IRedditCommunityAdmin.ICreate;

  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Generate a realistic report ID UUID
  const reportId = typia.random<string & tags.Format<"uuid">>();

  // 3. Retrieve the reddit community report by admin
  const report: IRedditCommunityReport =
    await api.functional.redditCommunity.admin.redditCommunityReports.at(
      connection,
      {
        id: reportId,
      },
    );
  typia.assert(report);

  // 4. Validate mandatory fields from the report
  TestValidator.predicate("report id matches", report.id === reportId);
  TestValidator.predicate(
    "reason is non-empty string",
    typeof report.reason === "string" && report.reason.length > 0,
  );
  TestValidator.predicate(
    "status is non-empty string",
    typeof report.status === "string" && report.status.length > 0,
  );
  TestValidator.predicate(
    "created_at valid date",
    typeof report.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at valid date",
    typeof report.updated_at === "string",
  );

  // 5. Validate related user and content references if present
  if (
    report.reddit_community_registered_user_id !== undefined &&
    report.reddit_community_registered_user_id !== null
  ) {
    TestValidator.predicate(
      "registered user id valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        report.reddit_community_registered_user_id,
      ),
    );
  }

  if (
    report.reddit_community_posts_id !== undefined &&
    report.reddit_community_posts_id !== null
  ) {
    TestValidator.predicate(
      "post id valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        report.reddit_community_posts_id,
      ),
    );
  }

  if (
    report.reddit_community_comments_id !== undefined &&
    report.reddit_community_comments_id !== null
  ) {
    TestValidator.predicate(
      "comment id valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        report.reddit_community_comments_id,
      ),
    );
  }

  // 6. Confirm optional description
  if (report.description !== undefined) {
    TestValidator.predicate(
      "description is string or null",
      report.description === null || typeof report.description === "string",
    );
  }

  // 7. Confirm optional deleted_at field
  if (report.deleted_at !== undefined) {
    TestValidator.predicate(
      "deleted_at is string or null",
      report.deleted_at === null || typeof report.deleted_at === "string",
    );
  }
}
