import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";

export async function test_api_reddit_community_admin_comment_report_creation(
  connection: api.IConnection,
) {
  // 1. Admin user signs up and authenticates
  const adminJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "StrongPass!23",
    href: "https://redditcommunity.example.com/admin/join",
    referrer: "https://redditcommunity.example.com/",
  } satisfies IRedditCommunityAdmin.IJoin;

  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Prepare comment report creation data
  // We must specify reason and reddit_community_comment_id as per ICreate
  const commentReportBody = {
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    reddit_community_comment_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IRedditCommunityCommentReport.ICreate;

  // 3. Create comment report with admin authenticated connection
  const commentReport: IRedditCommunityCommentReport =
    await api.functional.redditCommunity.admin.redditCommunityCommentReports.create(
      connection,
      { body: commentReportBody },
    );
  typia.assert(commentReport);

  // 4. Validate comment report fields
  TestValidator.predicate(
    "comment report id valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      commentReport.id,
    ),
  );

  TestValidator.equals(
    "comment report reason matches input",
    commentReport.reason,
    commentReportBody.reason,
  );
  TestValidator.equals(
    "comment id matches input",
    commentReport.reddit_community_comment_id,
    commentReportBody.reddit_community_comment_id,
  );

  TestValidator.predicate(
    "comment report has created_at as ISO date",
    typeof commentReport.created_at === "string" &&
      !isNaN(Date.parse(commentReport.created_at)),
  );
  TestValidator.predicate(
    "comment report has updated_at as ISO date",
    typeof commentReport.updated_at === "string" &&
      !isNaN(Date.parse(commentReport.updated_at)),
  );

  // Check the admin user's ID is linked to the report as report creator user ID
  TestValidator.equals(
    "comment report links to admin user id",
    commentReport.reddit_community_registereduser_id,
    admin.id,
  );
  TestValidator.predicate(
    "comment report has session id as valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      commentReport.reddit_community_registereduser_session_id,
    ),
  );

  // deleted_at should be null or undefined initially
  TestValidator.predicate(
    "comment report deleted_at is null or undefined",
    commentReport.deleted_at === null || commentReport.deleted_at === undefined,
  );
}
