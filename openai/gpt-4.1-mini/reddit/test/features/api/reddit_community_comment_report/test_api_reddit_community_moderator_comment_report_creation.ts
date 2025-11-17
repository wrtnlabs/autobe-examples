import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";

export async function test_api_reddit_community_moderator_comment_report_creation(
  connection: api.IConnection,
) {
  // 1. Moderator joins (register and authenticate) to obtain authentication token
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "securePassword123",
      } satisfies IRedditCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Prepare data for creating a comment report
  // Generate mock UUID for reported comment (uuid format per DTO)
  const commentId: string = typia.random<string & tags.Format<"uuid">>();
  const reportReason = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });

  // 3. Create the comment report with valid reason and comment identifier
  const commentReport: IRedditCommunityCommentReport =
    await api.functional.redditCommunity.moderator.redditCommunityCommentReports.create(
      connection,
      {
        body: {
          reason: reportReason,
          reddit_community_comment_id: commentId,
        } satisfies IRedditCommunityCommentReport.ICreate,
      },
    );
  typia.assert(commentReport);

  // 4. Validate critical fields of returned comment report
  TestValidator.equals(
    "Report reason matches",
    commentReport.reason,
    reportReason,
  );
  TestValidator.equals(
    "Reported comment ID matches",
    commentReport.reddit_community_comment_id,
    commentId,
  );
  TestValidator.predicate(
    "Moderator user ID is present",
    typeof commentReport.reddit_community_registereduser_id === "string" &&
      commentReport.reddit_community_registereduser_id.length > 0,
  );
  TestValidator.predicate(
    "Registered user session ID is present",
    typeof commentReport.reddit_community_registereduser_session_id ===
      "string" &&
      commentReport.reddit_community_registereduser_session_id.length > 0,
  );

  // 5. Validate timestamps are valid ISO date-time strings
  typia.assert<string & tags.Format<"date-time">>(commentReport.created_at);
  typia.assert<string & tags.Format<"date-time">>(commentReport.updated_at);

  // 6. Ensure deleted_at field is either null or undefined (means active)
  TestValidator.predicate(
    "deleted_at should be null or undefined",
    commentReport.deleted_at === null || commentReport.deleted_at === undefined,
  );
}
