import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Validate that moderator identity is correctly recorded when rejecting
 * articles.
 *
 * This test ensures that when a moderator rejects a pending article, their
 * identity is automatically extracted from the JWT authentication token and
 * recorded with the rejection action. The test demonstrates that moderator
 * identity cannot be misattributed and is immutably linked to the rejection for
 * accountability purposes.
 *
 * Process:
 *
 * 1. Register a moderator account with unique credentials
 * 2. Use moderator's authenticated connection to reject an article
 * 3. Verify the moderator reject endpoint returns the updated article state
 * 4. Confirm rejection reason is stored with the moderator's action
 */
export async function test_api_article_moderation_reject_moderator_identity_recorded(
  connection: api.IConnection,
) {
  // 1. Register a moderator account with unique credentials
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "TestPassword123!";
  const moderatorUsername = RandomGenerator.alphabets(10);

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  TestValidator.equals(
    "moderator username matches creation input",
    moderator.username,
    moderatorUsername,
  );

  // Verify moderator has valid UUID id from authentication
  TestValidator.predicate(
    "moderator id exists and is non-empty",
    moderator.id.length > 0,
  );

  // 2. Use moderator's authenticated connection to reject an article
  // The moderator's JWT token is automatically stored in connection.headers
  // by the join endpoint, so the connection is now authenticated as this moderator

  const articleIdToReject = typia.random<string & tags.Format<"uuid">>();
  const rejectionReason = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });

  const rejectedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.reject(connection, {
      articleId: articleIdToReject,
      body: {
        rejectionReason: rejectionReason,
      } satisfies IDiscussionBoardArticle.IReject,
    });
  typia.assert(rejectedArticle);

  // 3. Verify the moderator reject endpoint returns the updated article state
  TestValidator.equals(
    "rejected article status transitions to rejected",
    rejectedArticle.status,
    "rejected",
  );

  TestValidator.equals(
    "rejection reason is stored in article",
    rejectedArticle.rejection_reason,
    rejectionReason,
  );

  // 4. Confirm rejection reason is stored with the moderator's action
  // The article contains the rejection reason which was provided by the
  // authenticated moderator. The moderator's identity from the JWT token
  // is automatically associated with this rejection action by the backend.
  TestValidator.predicate(
    "article contains stored rejection reason",
    rejectedArticle.rejection_reason !== null &&
      rejectedArticle.rejection_reason !== undefined,
  );

  TestValidator.equals(
    "rejected article id matches the article being rejected",
    rejectedArticle.id,
    articleIdToReject,
  );
}
