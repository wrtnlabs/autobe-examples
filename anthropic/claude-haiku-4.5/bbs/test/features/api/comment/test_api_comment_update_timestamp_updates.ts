import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Validates that comment updated_at timestamps are properly updated on
 * modification.
 *
 * This test ensures that when a comment is edited, the updated_at field is
 * automatically updated to reflect the modification time. This is critical
 * for:
 *
 * - Sorting comments by recent activity
 * - Tracking change history and edit timeline
 * - Displaying edit indicators in the UI
 * - Audit trail compliance
 *
 * Test workflow:
 *
 * 1. Create contributor and moderator accounts
 * 2. Create and publish an article
 * 3. Post a comment (timestamp T1)
 * 4. Wait brief delay to ensure timestamp difference
 * 5. Update the comment content
 * 6. Verify updated_at timestamp T2 > T1
 * 7. Confirm edit_count incremented from 0 to 1
 */
export async function test_api_comment_update_timestamp_updates(
  connection: api.IConnection,
) {
  // Step 1: Create contributor account for posting comment
  const contributorEmail = typia.random<string & tags.Format<"email">>();
  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: contributorEmail,
        username: RandomGenerator.alphabets(8),
        password: "SecurePassword123!",
        href: "http://localhost:3000/register",
        referrer: "http://localhost:3000",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
  typia.assertGuard(contributor.token);

  // Step 2: Create moderator account for article approval
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: "ModeratorPass123!",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 3: Create article draft by contributor
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 2,
            wordMax: 5,
          }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          categoryId: typia.random<string & tags.Format<"uuid">>(),
          href: "http://localhost:3000/articles/new",
          referrer: "http://localhost:3000",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.equals("article status is draft", article.status, "draft");

  // Step 4: Approve article by moderator
  const approvedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.approve(
      connection,
      {
        articleId: article.id,
        body: {
          approvalNotes: "Article meets community guidelines",
        } satisfies IDiscussionBoardArticle.IApprove,
      },
    );
  typia.assert(approvedArticle);
  TestValidator.equals(
    "approved article status is published",
    approvedArticle.status,
    "published",
  );

  // Step 5: Post initial comment and capture timestamp T1
  const initialComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: approvedArticle.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(initialComment);

  const timestamp1 = new Date(initialComment.created_at).getTime();
  TestValidator.predicate(
    "initial comment has zero edit count",
    initialComment.edit_count === 0,
  );
  TestValidator.equals(
    "created_at equals updated_at initially",
    initialComment.created_at,
    initialComment.updated_at,
  );

  // Step 6: Wait brief delay to ensure timestamp difference (100ms minimum)
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 7: Update comment with new content
  const updatedComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.contributor.articles.comments.update(
      connection,
      {
        articleId: approvedArticle.id,
        commentId: initialComment.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(updatedComment);

  const timestamp2 = new Date(updatedComment.updated_at).getTime();

  // Step 8: Verify updated_at timestamp T2 > T1
  TestValidator.predicate(
    "updated_at timestamp is greater than created_at",
    timestamp2 > timestamp1,
  );

  TestValidator.predicate(
    "updated_at changed after modification",
    updatedComment.updated_at !== initialComment.updated_at,
  );

  // Step 9: Confirm edit_count incremented
  TestValidator.equals(
    "edit count incremented to 1 after update",
    updatedComment.edit_count,
    1,
  );

  TestValidator.equals(
    "created_at timestamp unchanged after edit",
    updatedComment.created_at,
    initialComment.created_at,
  );
}
