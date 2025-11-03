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
 * Test that guest users can search and retrieve paginated comments for a
 * specific article without authentication.
 *
 * This validates public access to comment discussions on economic and political
 * articles. The test creates an article with a category, posts multiple
 * comments on that article, then performs a search operation to retrieve those
 * comments without authentication.
 *
 * Workflow:
 *
 * 1. Create member account to author the article
 * 2. Create category for article classification
 * 3. Create article with the category
 * 4. Post multiple comments on the article
 * 5. Perform unauthenticated search to retrieve comments
 * 6. Validate response structure, content, and pagination
 */
export async function test_api_article_comments_search_public_access(
  connection: api.IConnection,
) {
  // Step 1: Create member account to author the article
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: memberEmail,
      password: "SecurePass123!@#",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // Step 2: Create category required for article creation
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: `Economics ${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create article to hold comments for search testing
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 4,
          wordMax: 8,
        }),
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        summary: RandomGenerator.paragraph({ sentences: 2 }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 4: Create multiple comments on the article
  const commentContents = ArrayUtil.repeat(
    5,
    (index) =>
      `Comment ${index + 1}: ${RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 })}`,
  );

  const createdComments = await ArrayUtil.asyncMap(
    commentContents,
    async (content) => {
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
      return comment;
    },
  );

  // Step 5: Perform unauthenticated search to retrieve comments
  // Create a fresh connection without authentication headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  const searchResult =
    await api.functional.discussionBoard.articles.comments.index(unauthConn, {
      articleId: article.id,
      body: {
        discussion_board_article_id: article.id,
        page: 1,
        limit: 10,
        sort_by: "created_at",
        sort_order: "asc",
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(searchResult);

  // Step 6: Validate response includes comment content, author information, timestamps, and proper pagination metadata
  TestValidator.predicate(
    "search result should have data array",
    searchResult.data !== undefined && Array.isArray(searchResult.data),
  );

  TestValidator.predicate(
    "search result should have pagination",
    searchResult.pagination !== undefined,
  );

  TestValidator.equals(
    "pagination current page should be 1",
    searchResult.pagination.current,
    1,
  );

  TestValidator.predicate(
    "should return all created comments",
    searchResult.data.length >= createdComments.length,
  );

  // Validate each comment in the response
  searchResult.data.forEach((commentSummary, index) => {
    TestValidator.predicate(
      `comment ${index} should have id`,
      commentSummary.id !== undefined && typeof commentSummary.id === "string",
    );

    TestValidator.predicate(
      `comment ${index} should have content`,
      commentSummary.content !== undefined && commentSummary.content.length > 0,
    );

    TestValidator.predicate(
      `comment ${index} should have author_type`,
      commentSummary.author_type === "member" ||
        commentSummary.author_type === "moderator",
    );

    TestValidator.predicate(
      `comment ${index} should have created_at timestamp`,
      commentSummary.created_at !== undefined,
    );

    TestValidator.predicate(
      `comment ${index} should have updated_at timestamp`,
      commentSummary.updated_at !== undefined,
    );

    // Validate author information is present based on author_type
    if (commentSummary.author_type === "member") {
      TestValidator.predicate(
        `comment ${index} should have memberAuthor when author_type is member`,
        commentSummary.memberAuthor !== null &&
          commentSummary.memberAuthor !== undefined,
      );
    }
  });

  // Step 7: Verify that soft-deleted comments are excluded from results
  // All returned comments should be active (no deleted_at timestamp in full comment entity)
  // Since we're getting ISummary, we validate that all comments we created are present
  const returnedCommentIds = searchResult.data.map((c) => c.id);
  createdComments.forEach((created) => {
    TestValidator.predicate(
      `created comment ${created.id} should be present in search results`,
      returnedCommentIds.includes(created.id),
    );
  });
}
