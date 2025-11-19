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
 * Test article status transition from pending_approval to rejected.
 *
 * Validates that moderators can reject articles pending approval and that the
 * article status transitions correctly to 'rejected'. Confirms that rejected
 * articles are preserved in the system with the rejection reason recorded for
 * author reference, while being prevented from publication.
 *
 * Test Flow:
 *
 * 1. Register and authenticate a moderator for rejection authorization
 * 2. Call the article rejection endpoint with test data
 * 3. Verify the article status is set to 'rejected'
 * 4. Verify the rejection reason is recorded in the response
 * 5. Confirm the article data is preserved and returned
 */
export async function test_api_article_moderation_reject_status_transition(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        username: RandomGenerator.alphabets(8),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator should be authenticated with valid id",
    moderator.id !== null && moderator.email !== null,
  );

  // Step 2: Call the article rejection endpoint
  const articleIdToReject = typia.random<string & tags.Format<"uuid">>();
  const rejectionReason = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 6,
  });

  const rejectedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.reject(connection, {
      articleId: articleIdToReject,
      body: {
        rejectionReason: rejectionReason,
      } satisfies IDiscussionBoardArticle.IReject,
    });
  typia.assert(rejectedArticle);

  // Step 3: Verify the article status changed to 'rejected'
  TestValidator.equals(
    "article status should be 'rejected' after moderation rejection",
    rejectedArticle.status,
    "rejected",
  );

  // Step 4: Verify the rejection reason is recorded
  TestValidator.equals(
    "rejection reason should be recorded in the article response",
    rejectedArticle.rejection_reason,
    rejectionReason,
  );

  // Step 5: Confirm the article record is preserved with complete data
  TestValidator.predicate(
    "article should have a valid id",
    rejectedArticle.id !== null && rejectedArticle.id.length > 0,
  );

  TestValidator.predicate(
    "article should have title preserved",
    rejectedArticle.title !== null && rejectedArticle.title.length > 0,
  );

  TestValidator.predicate(
    "article should have content preserved",
    rejectedArticle.content !== null && rejectedArticle.content.length > 0,
  );

  TestValidator.predicate(
    "article should have author information",
    rejectedArticle.author !== null && rejectedArticle.author.id !== null,
  );

  TestValidator.predicate(
    "article should have category information",
    rejectedArticle.category !== null && rejectedArticle.category.id !== null,
  );
}
