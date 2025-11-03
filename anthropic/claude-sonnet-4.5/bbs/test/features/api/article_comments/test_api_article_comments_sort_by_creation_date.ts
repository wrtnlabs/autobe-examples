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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";

/**
 * Test sorting comments by creation date in both ascending and descending
 * order.
 *
 * This test validates that users can view comments in different chronological
 * orders such as newest first or oldest first. It creates an article with
 * multiple comments posted at different times, then retrieves comments sorted
 * by creation date in both directions to verify correct ordering.
 *
 * Workflow:
 *
 * 1. Create member account for authoring article and comments
 * 2. Create category required for article creation
 * 3. Create article to hold comments
 * 4. Create multiple comments
 * 5. Retrieve comments sorted descending (newest first)
 * 6. Verify descending order correctness
 * 7. Retrieve comments sorted ascending (oldest first)
 * 8. Verify ascending order correctness
 */
export async function test_api_article_comments_sort_by_creation_date(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: memberEmail,
      password: memberPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // Step 2: Create category (using authenticated member session)
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

  // Step 3: Create article to hold comments
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 7,
        }),
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        summary: RandomGenerator.paragraph({ sentences: 2 }),
        category_ids: [category.id],
        tag_ids: [],
        image_ids: [],
        document_ids: [],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 4: Create multiple comments
  const commentContents = ArrayUtil.repeat(
    5,
    (index) =>
      `Comment ${index + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
  );

  const createdComments: IDiscussionBoardComment[] = [];
  for (const content of commentContents) {
    const comment =
      await api.functional.discussionBoard.member.articles.comments.create(
        connection,
        {
          articleId: article.id,
          body: {
            discussion_board_article_id: article.id,
            discussion_board_parent_comment_id: null,
            content: content,
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    typia.assert(comment);
    createdComments.push(comment);
  }

  // Step 5: Retrieve comments sorted by creation date descending (newest first)
  const descendingResult =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        discussion_board_article_id: article.id,
        sort_by: "created_at",
        sort_order: "desc",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(descendingResult);

  // Step 6: Verify descending order correctness
  TestValidator.equals(
    "comment count matches",
    descendingResult.data.length,
    createdComments.length,
  );

  for (let i = 0; i < descendingResult.data.length - 1; i++) {
    const current = new Date(descendingResult.data[i].created_at);
    const next = new Date(descendingResult.data[i + 1].created_at);
    TestValidator.predicate(
      `comment ${i} is newer than or equal to comment ${i + 1} in descending order`,
      current >= next,
    );
  }

  // Step 7: Retrieve comments sorted by creation date ascending (oldest first)
  const ascendingResult =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        discussion_board_article_id: article.id,
        sort_by: "created_at",
        sort_order: "asc",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(ascendingResult);

  // Step 8: Verify ascending order correctness
  TestValidator.equals(
    "comment count matches in ascending",
    ascendingResult.data.length,
    createdComments.length,
  );

  for (let i = 0; i < ascendingResult.data.length - 1; i++) {
    const current = new Date(ascendingResult.data[i].created_at);
    const next = new Date(ascendingResult.data[i + 1].created_at);
    TestValidator.predicate(
      `comment ${i} is older than or equal to comment ${i + 1} in ascending order`,
      current <= next,
    );
  }

  // Verify that ascending and descending are reverse of each other
  TestValidator.equals(
    "first comment in descending is last in ascending",
    descendingResult.data[0].id,
    ascendingResult.data[ascendingResult.data.length - 1].id,
  );

  TestValidator.equals(
    "last comment in descending is first in ascending",
    descendingResult.data[descendingResult.data.length - 1].id,
    ascendingResult.data[0].id,
  );
}
