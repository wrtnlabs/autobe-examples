import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_reddit_community_registered_user_submit_comment_report(
  connection: api.IConnection,
) {
  // 1. Register a new registeredUser with proper email and password
  const registrationBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityRegisteredUser.ICreate;
  const registeredUser = await api.functional.auth.registeredUser.join(
    connection,
    {
      body: registrationBody,
    },
  );
  typia.assert(registeredUser);

  // 2. Submit a new comment report using the registered user's authorization
  // Prepare a comment ID for reporting (random UUID string)
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const reportBody = {
    reason: "Inappropriate content",
    reddit_community_comment_id: commentId,
  } satisfies IRedditCommunityCommentReport.ICreate;

  const commentReport =
    await api.functional.redditCommunity.registeredUser.redditCommunityCommentReports.create(
      connection,
      {
        body: reportBody,
      },
    );
  typia.assert(commentReport);

  // Validate comment report fields
  TestValidator.equals(
    "comment report reason matches",
    commentReport.reason,
    reportBody.reason,
  );
  TestValidator.equals(
    "comment report comment ID matches",
    commentReport.reddit_community_comment_id,
    reportBody.reddit_community_comment_id,
  );
  TestValidator.predicate(
    "comment report has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      commentReport.id,
    ),
  );
  TestValidator.equals(
    "comment report user ID matches registered user",
    commentReport.reddit_community_registereduser_id,
    registeredUser.id,
  );
  TestValidator.predicate(
    "comment report created_at exists",
    commentReport.created_at !== null && commentReport.created_at !== undefined,
  );
}
