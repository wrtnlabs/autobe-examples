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
 * Test audit trail creation for article moderation approval.
 *
 * This test validates that when moderators approve discussion board articles,
 * the approval action is properly recorded with moderator identity and approval
 * notes. The immutable audit trail entry creation is handled by the backend,
 * and this test validates the moderator approval response structure and
 * metadata recording for compliance documentation.
 *
 * The test workflow:
 *
 * 1. Register and authenticate a moderator account with full permissions
 * 2. Approve an article with constructive feedback notes
 * 3. Verify article transitions from pending_approval to published status
 * 4. Confirm moderator identity is recorded in approved_by_moderator field
 * 5. Validate published_at timestamp is set for compliance tracking
 * 6. Verify approval notes are stored and accessible for audit trail
 * 7. Confirm all required timestamps are properly recorded
 * 8. Validate response contains complete moderation metadata
 */
export async function test_api_article_moderation_approve_audit_trail_creation(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(10);
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePass123!",
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
  TestValidator.equals(
    "moderator account is active",
    moderator.account_status,
    "active",
  );
  TestValidator.equals(
    "moderator has full moderation tier",
    moderator.moderation_tier,
    "full",
  );

  // 2. Approve an article with audit trail metadata
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const approvalNotes = RandomGenerator.paragraph({ sentences: 3 });

  const approvedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.approve(
      connection,
      {
        articleId: articleId,
        body: {
          approvalNotes: approvalNotes,
        } satisfies IDiscussionBoardArticle.IApprove,
      },
    );
  typia.assert(approvedArticle);

  // 3. Validate article status is published after approval
  TestValidator.equals(
    "article status transitioned to published",
    approvedArticle.status,
    "published",
  );

  // 4. Verify moderator identity is recorded in approval
  TestValidator.predicate(
    "article has approved by moderator recorded",
    approvedArticle.approvedByModerator !== undefined &&
      approvedArticle.approvedByModerator !== null,
  );

  if (approvedArticle.approvedByModerator) {
    TestValidator.equals(
      "approved by moderator ID matches",
      approvedArticle.approvedByModerator.id,
      moderator.id,
    );
    TestValidator.equals(
      "moderator username in approval metadata",
      approvedArticle.approvedByModerator.username,
      moderator.username,
    );
  }

  // 5. Validate published_at timestamp is set for compliance
  TestValidator.predicate(
    "published_at timestamp is set",
    approvedArticle.published_at !== undefined &&
      approvedArticle.published_at !== null,
  );

  // 6. Verify approval notes are stored for audit trail
  TestValidator.equals(
    "approval notes stored correctly",
    approvedArticle.approval_notes,
    approvalNotes,
  );

  // 7. Validate all timestamps are valid ISO 8601 format
  TestValidator.predicate("published_at is valid ISO date", () => {
    if (!approvedArticle.published_at) return false;
    const date = new Date(approvedArticle.published_at);
    return !isNaN(date.getTime());
  });

  TestValidator.predicate("created_at is valid ISO date", () => {
    const date = new Date(approvedArticle.created_at);
    return !isNaN(date.getTime());
  });

  TestValidator.predicate("updated_at is valid ISO date", () => {
    const date = new Date(approvedArticle.updated_at);
    return !isNaN(date.getTime());
  });

  // 8. Validate response contains complete moderation metadata
  TestValidator.predicate(
    "article contains all required fields",
    approvedArticle.id !== undefined &&
      approvedArticle.title !== undefined &&
      approvedArticle.content !== undefined &&
      approvedArticle.author !== undefined &&
      approvedArticle.category !== undefined,
  );

  TestValidator.predicate(
    "approval notes not empty",
    approvedArticle.approval_notes !== null &&
      approvedArticle.approval_notes !== undefined &&
      approvedArticle.approval_notes.length > 0,
  );
}
