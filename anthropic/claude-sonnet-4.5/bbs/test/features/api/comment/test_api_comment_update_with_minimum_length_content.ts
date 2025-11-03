import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test updating a comment to minimum valid content length (1 character).
 *
 * This test validates that the comment update API correctly accepts and stores
 * comment content at the minimum boundary length of 1 character. The test
 * creates a complete workflow from member registration through comment update
 * to ensure the minimum length validation works correctly.
 *
 * Workflow:
 *
 * 1. Register a new member account
 * 2. Create a category for article organization
 * 3. Create and publish an article
 * 4. Post an initial comment with normal content
 * 5. Update the comment to exactly 1 character
 * 6. Validate the update succeeds and content is stored correctly
 */
export async function test_api_comment_update_with_minimum_length_content(
  connection: api.IConnection,
) {
  // Step 1: Create new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<30> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // Step 2: Create category for article
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create and publish article
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 2 }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 4: Post initial comment with normal content
  const initialComment =
    await api.functional.discussionBoard.articles.comments.create(connection, {
      articleId: article.id,
      body: {
        discussion_board_article_id: article.id,
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IDiscussionBoardComment.ICreate,
    });
  typia.assert(initialComment);

  // Step 5: Update comment to exactly 1 character (minimum boundary)
  const minimalContent = "A";
  const updatedComment =
    await api.functional.discussionBoard.member.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: initialComment.id,
        body: {
          content: minimalContent,
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(updatedComment);

  // Step 6: Validate the update succeeded
  TestValidator.equals(
    "updated comment ID matches",
    updatedComment.id,
    initialComment.id,
  );
  TestValidator.equals(
    "comment content is exactly 1 character",
    updatedComment.content,
    minimalContent,
  );
  TestValidator.equals("content length is 1", updatedComment.content.length, 1);
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updatedComment.updated_at) > new Date(updatedComment.created_at),
  );
}
