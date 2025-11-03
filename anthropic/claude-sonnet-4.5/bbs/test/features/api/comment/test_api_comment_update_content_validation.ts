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
 * Test comment update with various content validation scenarios.
 *
 * This test validates that the comment update endpoint properly accepts content
 * within the valid length constraints (1-5000 characters). The test creates the
 * necessary authentication and content context, then updates a comment with
 * minimum and maximum valid content lengths to ensure the API correctly
 * processes these boundary cases.
 *
 * Test workflow:
 *
 * 1. Create moderator account for authentication
 * 2. Create category required for article creation
 * 3. Create article to contain the comment
 * 4. Create initial comment with standard content
 * 5. Update comment with minimum valid length (1 character)
 * 6. Update comment with maximum valid length (5000 characters)
 * 7. Validate all updates are processed correctly
 */
export async function test_api_comment_update_content_validation(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for authentication
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create category required for article creation
  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create article to contain the comment
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 4: Create initial comment with standard content
  const initialComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.moderator.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          discussion_board_article_id: article.id,
          content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(initialComment);

  // Step 5: Update comment with minimum valid length (1 character)
  const minLengthContent = "a";
  const minLengthUpdate: IDiscussionBoardComment =
    await api.functional.discussionBoard.moderator.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: initialComment.id,
        body: {
          content: minLengthContent,
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(minLengthUpdate);
  TestValidator.equals(
    "minimum length comment updated",
    minLengthUpdate.content,
    minLengthContent,
  );

  // Step 6: Update comment with maximum valid length (5000 characters)
  const maxLengthContent = RandomGenerator.alphabets(5000);
  const maxLengthUpdate: IDiscussionBoardComment =
    await api.functional.discussionBoard.moderator.articles.comments.update(
      connection,
      {
        articleId: article.id,
        commentId: initialComment.id,
        body: {
          content: maxLengthContent,
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(maxLengthUpdate);
  TestValidator.equals(
    "maximum length comment updated",
    maxLengthUpdate.content,
    maxLengthContent,
  );
}
