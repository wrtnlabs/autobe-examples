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
 * Test successful rejection of a pending article by a moderator.
 *
 * This test validates the article rejection workflow:
 *
 * 1. Moderator account creation and authentication
 * 2. Moderator rejects a pending article with required feedback reason
 * 3. Validates article transitions to rejected status
 * 4. Confirms rejection_reason is properly stored
 * 5. Verifies moderator information is recorded
 * 6. Ensures article is marked as rejected and not publishable
 *
 * The test ensures proper moderation capabilities and rejection metadata
 * persistence.
 */
export async function test_api_article_moderation_reject_pending_article(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(10);
  const moderatorPassword = "TestPass123!" + RandomGenerator.alphaNumeric(4);

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
    "moderator email matches registration",
    moderator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator username matches registration",
    moderator.username,
    moderatorUsername,
  );
  TestValidator.predicate(
    "moderator has valid access token",
    moderator.token.access.length > 0,
  );

  // Step 2: Prepare article rejection
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const rejectionReason = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 8,
  });

  // Step 3: Reject the article
  const rejectedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.reject(connection, {
      articleId: articleId,
      body: {
        rejectionReason: rejectionReason,
      } satisfies IDiscussionBoardArticle.IReject,
    });
  typia.assert(rejectedArticle);

  // Step 4: Validate article status is rejected
  TestValidator.equals(
    "article status transitions to rejected",
    rejectedArticle.status,
    "rejected",
  );

  // Step 5: Validate rejection reason is stored
  TestValidator.equals(
    "rejection_reason matches provided reason",
    rejectedArticle.rejection_reason,
    rejectionReason,
  );

  // Step 6: Validate rejection_reason is not null
  TestValidator.predicate(
    "rejection_reason is present in response",
    rejectedArticle.rejection_reason !== null &&
      rejectedArticle.rejection_reason !== undefined,
  );

  // Step 7: Validate article is not in pending_approval
  TestValidator.notEquals(
    "article no longer in pending_approval status",
    rejectedArticle.status,
    "pending_approval",
  );

  // Step 8: Validate article is not published
  TestValidator.notEquals(
    "rejected article is not published",
    rejectedArticle.status,
    "published",
  );

  // Step 9: Validate article has required fields
  TestValidator.predicate(
    "article has valid id",
    rejectedArticle.id !== null && rejectedArticle.id !== undefined,
  );

  TestValidator.predicate(
    "article has title",
    rejectedArticle.title.length >= 5 && rejectedArticle.title.length <= 200,
  );

  TestValidator.predicate(
    "article has content",
    rejectedArticle.content.length >= 50 &&
      rejectedArticle.content.length <= 50000,
  );

  // Step 10: Validate author information is present
  TestValidator.predicate(
    "article has author with id",
    rejectedArticle.author.id !== null &&
      rejectedArticle.author.id !== undefined,
  );

  TestValidator.predicate(
    "article has author with username",
    rejectedArticle.author.username.length > 0,
  );

  // Step 11: Validate category information
  TestValidator.predicate(
    "article has category with id",
    rejectedArticle.category.id !== null &&
      rejectedArticle.category.id !== undefined,
  );

  TestValidator.predicate(
    "article has category code",
    rejectedArticle.category.code.length > 0,
  );

  // Step 12: Validate timestamps
  TestValidator.predicate(
    "article has created_at timestamp",
    rejectedArticle.created_at !== null &&
      rejectedArticle.created_at !== undefined,
  );

  TestValidator.predicate(
    "article has updated_at timestamp",
    rejectedArticle.updated_at !== null &&
      rejectedArticle.updated_at !== undefined,
  );
}
