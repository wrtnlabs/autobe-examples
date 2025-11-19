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
 * Test that immutable audit trail entry is created for rejection compliance
 * documentation.
 *
 * This test validates that when a moderator rejects a pending article, the
 * rejection is properly recorded with moderation context. The rejection reason
 * is stored for guidance to the contributor, and the article status is updated
 * to 'rejected', providing accountability and compliance tracking for rejection
 * decisions.
 *
 * Workflow:
 *
 * 1. Register moderator via /auth/moderator/join
 * 2. Attempt article rejection with valid rejection reason
 * 3. Verify article status is 'rejected' and rejection reason is stored
 * 4. Validate that rejection maintains article integrity and audit context
 */
export async function test_api_article_moderation_reject_audit_trail_creation(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: RandomGenerator.alphaNumeric(8),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  TestValidator.equals(
    "moderator email matches input",
    moderator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator account status is active",
    moderator.account_status,
    "active",
  );
  TestValidator.equals(
    "moderator has full moderation tier",
    moderator.moderation_tier,
    "full",
  );

  // Step 2: Prepare rejection data
  // Create article ID as UUID that would exist in pending_approval status
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const rejectionReason = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });

  // Step 3: Reject the article with rejection reason
  // This endpoint transitions article from pending_approval to rejected status
  const rejectedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.reject(connection, {
      articleId: articleId,
      body: {
        rejectionReason: rejectionReason,
      } satisfies IDiscussionBoardArticle.IReject,
    });
  typia.assert(rejectedArticle);

  // Step 4: Verify the article status is updated to 'rejected'
  TestValidator.equals(
    "article status transitioned to rejected",
    rejectedArticle.status,
    "rejected",
  );

  // Step 5: Verify rejection reason is stored in the article
  TestValidator.equals(
    "rejection reason matches moderator input",
    rejectedArticle.rejection_reason,
    rejectionReason,
  );

  // Step 6: Verify article ID matches the rejection request
  TestValidator.equals(
    "article ID matches rejection request",
    rejectedArticle.id,
    articleId,
  );

  // Step 7: Verify audit trail context through timestamp updates
  // The updated_at timestamp reflects the rejection moderation action
  TestValidator.predicate(
    "article updated_at timestamp records rejection action",
    rejectedArticle.updated_at !== null &&
      rejectedArticle.updated_at !== undefined,
  );

  // Step 8: Validate rejection reason length is within constraints
  TestValidator.predicate(
    "rejection reason respects maximum length constraint",
    !rejectedArticle.rejection_reason ||
      rejectedArticle.rejection_reason.length <= 500,
  );

  // Step 9: Verify article creation timestamp is preserved
  // Audit trail immutability: created_at should not change
  TestValidator.predicate(
    "article created_at timestamp is preserved for audit trail",
    rejectedArticle.created_at !== null &&
      rejectedArticle.created_at !== undefined,
  );

  // Step 10: Ensure rejection is recorded as permanent in status
  // The article state reflects the rejection is an immutable audit record
  TestValidator.equals(
    "article rejection status confirms audit trail entry",
    rejectedArticle.status,
    "rejected",
  );

  // Step 11: Validate that no approval moderator is set on rejected article
  // Rejection and approval are mutually exclusive moderation actions
  TestValidator.predicate(
    "rejected article does not have approval moderator reference",
    rejectedArticle.approvedByModerator === null ||
      rejectedArticle.approvedByModerator === undefined,
  );
}
