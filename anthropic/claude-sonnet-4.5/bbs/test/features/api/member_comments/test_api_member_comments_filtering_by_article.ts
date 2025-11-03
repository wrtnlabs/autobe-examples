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
 * Test filtering a member's comments by parent article.
 *
 * This test validates the article filtering functionality of the member
 * comments retrieval endpoint. It creates a member account, multiple articles,
 * and comments posted across different articles, then verifies that filtering
 * by article ID returns only the comments belonging to that specific article.
 *
 * Note: This test assumes at least one category already exists in the system,
 * as category creation requires moderator privileges which are not available
 * through the provided API endpoints.
 *
 * Test workflow:
 *
 * 1. Create member account to post comments
 * 2. Create multiple articles (Article A and Article B) using assumed category
 * 3. Post comments on both articles
 * 4. Filter member's comments by Article A's ID
 * 5. Verify only Article A's comments are returned
 * 6. Validate article information is correctly included
 * 7. Ensure Article B's comments are excluded from results
 */
export async function test_api_member_comments_filtering_by_article(
  connection: api.IConnection,
) {
  // Step 1: Create member account to post comments
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(10);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // Step 2: Create a test category (assuming we have moderator access through the member token)
  // Note: Using a generated UUID as category_id since we cannot create categories
  const testCategoryId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Create Article A
  const articleA = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 2 }),
        category_ids: [testCategoryId],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(articleA);

  // Create Article B
  const articleB = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 2 }),
        category_ids: [testCategoryId],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(articleB);

  // Step 4: Post comments on Article A
  const commentA1 =
    await api.functional.discussionBoard.articles.comments.create(connection, {
      articleId: articleA.id,
      body: {
        discussion_board_article_id: articleA.id,
        content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IDiscussionBoardComment.ICreate,
    });
  typia.assert(commentA1);

  const commentA2 =
    await api.functional.discussionBoard.articles.comments.create(connection, {
      articleId: articleA.id,
      body: {
        discussion_board_article_id: articleA.id,
        content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IDiscussionBoardComment.ICreate,
    });
  typia.assert(commentA2);

  // Post comments on Article B
  const commentB1 =
    await api.functional.discussionBoard.articles.comments.create(connection, {
      articleId: articleB.id,
      body: {
        discussion_board_article_id: articleB.id,
        content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IDiscussionBoardComment.ICreate,
    });
  typia.assert(commentB1);

  // Step 5: Filter member's comments by Article A
  const filteredComments =
    await api.functional.discussionBoard.members.comments.index(connection, {
      memberUsername: memberUsername,
      body: {
        discussion_board_article_id: articleA.id,
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(filteredComments);

  // Step 6: Verify only Article A's comments are returned
  TestValidator.equals(
    "filtered comments count should be 2",
    filteredComments.data.length,
    2,
  );

  // Step 7: Validate all returned comments belong to Article A
  for (const comment of filteredComments.data) {
    TestValidator.predicate(
      "comment should belong to Article A",
      comment.id === commentA1.id || comment.id === commentA2.id,
    );
  }

  // Step 8: Ensure Article B's comments are not in the results
  const hasCommentB = filteredComments.data.some((c) => c.id === commentB1.id);
  TestValidator.predicate(
    "Article B comment should not be in filtered results",
    !hasCommentB,
  );

  // Validate pagination information
  TestValidator.equals(
    "total records should be 2",
    filteredComments.pagination.records,
    2,
  );
}
