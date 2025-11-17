import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";

/**
 * This test validates the update operation on a Reddit community comment report
 * by an authenticated moderator.
 *
 * Steps:
 *
 * 1. Moderator account creation (join) for authentication.
 * 2. Admin account creation (join) for authorization to create a comment report.
 * 3. Admin login to authorize comment report creation.
 * 4. Create a new comment report through admin API to serve as the update target.
 * 5. Moderator login to authorize update operations.
 * 6. Update the 'reason' field of the created comment report as a moderator.
 * 7. Validate the update response reflects the new reason and other details
 *    correctly.
 *
 * This comprehensive test ensures proper multi-actor authentication,
 * authorization, and functional correctness of the report update workflow.
 */
export async function test_api_reddit_community_comment_report_update_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create Moderator (join)
  const moderatorJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IRedditCommunityModerator.ICreate;
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorJoinBody,
  });
  typia.assert(moderator);

  // Step 2: Create Admin (join) to create comment report
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
  } satisfies IRedditCommunityAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // Step 3: Admin login
  const adminLoginBody = {
    username: adminJoinBody.email,
    password: adminJoinBody.password,
    href: "https://example.com/login",
    referrer: "https://example.com/referrer",
  } satisfies IRedditCommunityAdmin.ILogin;
  await api.functional.auth.admin.login(connection, {
    body: adminLoginBody,
  });

  // Step 4: Create reddit community comment report as Admin
  const commentReportCreateBody = {
    reason: "Initial report reason",
    reddit_community_comment_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IRedditCommunityCommentReport.ICreate;
  const commentReport =
    await api.functional.redditCommunity.admin.redditCommunityCommentReports.create(
      connection,
      {
        body: commentReportCreateBody,
      },
    );
  typia.assert(commentReport);

  // Step 5: Moderator login to switch authentication context
  const moderatorLoginBody = {
    email: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: null,
    href: "https://example.com/login",
    referrer: "https://example.com/referrer",
  } satisfies IRedditCommunityModerator.ILogin;
  await api.functional.auth.moderator.login(connection, {
    body: moderatorLoginBody,
  });

  // Step 6: Moderator updates the reason field of the comment report
  const updatedReason = "Updated report reason to clarify issue.";
  const updateBody = {
    reason: updatedReason,
  } satisfies IRedditCommunityCommentReport.IUpdate;
  const updatedReport =
    await api.functional.redditCommunity.moderator.redditCommunityCommentReports.update(
      connection,
      {
        commentReportId: commentReport.id,
        body: updateBody,
      },
    );
  typia.assert(updatedReport);

  // Step 7: Validate that updatedReport matches updated reason and other data
  TestValidator.equals(
    "Updated reason should be reflected",
    updatedReport.reason,
    updatedReason,
  );
  TestValidator.equals(
    "Updated report ID remains same",
    updatedReport.id,
    commentReport.id,
  );
  TestValidator.equals(
    "Reported comment ID remains same",
    updatedReport.reddit_community_comment_id,
    commentReport.reddit_community_comment_id,
  );
}
