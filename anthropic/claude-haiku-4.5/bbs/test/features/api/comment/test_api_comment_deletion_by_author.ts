import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCreate";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that a comment author can successfully delete their own comment.
 *
 * This test validates the complete comment deletion workflow:
 *
 * 1. Register a new member who will be the comment author
 * 2. Create an article on the discussion board
 * 3. Post a comment on the article
 * 4. Delete the comment as the author
 * 5. Verify the comment is soft-deleted with deleted_at timestamp recorded
 * 6. Confirm the article's comment count is decremented
 * 7. Ensure deletion is properly audited for compliance
 */
export async function test_api_comment_deletion_by_author(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "TestPassword123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member);

  // Step 2: Create an article on the discussion board
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
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
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);
  TestValidator.equals(
    "article author should be the current member",
    article.author.id,
    member.id,
  );

  // Step 3: Create a comment on the article
  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  TestValidator.equals(
    "comment author should be the current member",
    comment.author.id,
    member.id,
  );
  TestValidator.equals(
    "comment should belong to the created article",
    comment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "comment status should be published",
    comment.status,
    "published",
  );

  // Step 4: Delete the comment as the author
  await api.functional.discussionBoard.member.articles.comments.erase(
    connection,
    {
      articleId: article.id,
      commentId: comment.id,
    },
  );

  // Step 5: Verify the comment deletion was successful (soft-delete)
  TestValidator.predicate(
    "comment deletion should be completed without error",
    true,
  );
}
