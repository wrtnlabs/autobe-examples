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
 * Test article approval without including optional moderator notes.
 *
 * This test validates that the approval_notes field is optional in the article
 * approval request and can be omitted without affecting the approval process.
 * The test ensures that:
 *
 * 1. A moderator can approve an article without providing optional approval notes
 * 2. The article transitions from pending_approval to published status
 * 3. The approval_notes field is stored as null when not provided
 * 4. The approving moderator is recorded in the response
 * 5. The published_at timestamp is set upon approval
 *
 * Workflow:
 *
 * 1. Register and authenticate a moderator account
 * 2. Create a pending article (using random article data to simulate existing
 *    pending articles)
 * 3. Approve the article without providing optional approval notes
 * 4. Validate that the article status changed to published
 * 5. Validate that approval_notes is null in the response
 * 6. Validate that approvedByModerator contains the moderator who approved it
 * 7. Validate that published_at timestamp is set
 */
export async function test_api_article_moderation_approve_without_optional_notes(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "ValidPassword123!",
        username: RandomGenerator.alphabets(20),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator account created successfully",
    moderator.id !== null,
  );

  // Step 2: Create a mock pending article by generating random article data
  // In a real scenario, this would be created by a contributor via the API
  const pendingArticle: IDiscussionBoardArticle = {
    id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
    status: "pending_approval",
    author: {
      id: typia.random<string & tags.Format<"uuid">>(),
      username: RandomGenerator.alphabets(15),
    } satisfies IDiscussionBoardContributor.ISummary,
    category: {
      id: typia.random<string & tags.Format<"uuid">>(),
      code: "economics",
      name: "Economics",
      display_order: 0,
      is_active: true,
      article_count: 42,
    } satisfies IDiscussionBoardArticleCategory.ISummary,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    view_count: 0,
    comment_count: 0,
    is_pinned: false,
    is_locked: false,
  };

  // Step 3: Approve the article WITHOUT providing optional approval notes
  // This tests that approvalNotes is truly optional
  const approvedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.approve(
      connection,
      {
        articleId: pendingArticle.id,
        body: {} satisfies IDiscussionBoardArticle.IApprove,
      },
    );
  typia.assert(approvedArticle);

  // Step 4: Validate that the article status changed to published
  TestValidator.equals(
    "article status should be published after approval",
    approvedArticle.status,
    "published",
  );

  // Step 5: Validate that approval_notes is null when not provided
  TestValidator.equals(
    "approval_notes should be null when not provided in request",
    approvedArticle.approval_notes,
    null,
  );

  // Step 6: Validate that approvedByModerator contains the moderator info
  TestValidator.predicate(
    "approvedByModerator should be set after approval",
    approvedArticle.approvedByModerator !== null &&
      approvedArticle.approvedByModerator !== undefined,
  );

  if (approvedArticle.approvedByModerator) {
    TestValidator.equals(
      "approvedByModerator should contain the moderator username",
      approvedArticle.approvedByModerator.username,
      moderator.username,
    );
  }

  // Step 7: Validate that published_at timestamp is set
  TestValidator.predicate(
    "published_at should be set after approval",
    approvedArticle.published_at !== null &&
      approvedArticle.published_at !== undefined,
  );
}
