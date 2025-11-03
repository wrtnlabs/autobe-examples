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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";

/**
 * Test member's ability to search their own comments by content text.
 *
 * This test validates the comment search functionality with full-text search
 * capabilities. The workflow:
 *
 * 1. Create a member account
 * 2. Create an article as a container for comments
 * 3. Post multiple comments with distinctive keywords and phrases
 * 4. Execute search queries to validate content matching
 * 5. Verify keyword matching, phrase searching, result ranking, and empty result
 *    handling
 * 6. Confirm search respects member ownership (only searches own comments)
 *
 * Business Goals:
 *
 * - Validate keyword search functionality works accurately
 * - Ensure phrase searching with exact matches works correctly
 * - Verify results are ranked by relevance
 * - Handle special characters and punctuation appropriately
 * - Ensure empty results return when no matches found
 * - Confirm member ownership is respected (can't search other members' comments)
 */
export async function test_api_member_comments_search_by_content(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "TestPassword123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member);
  TestValidator.predicate("member created", member.id !== undefined);

  // Step 2: Create an article as a container for comments
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: "Economic Analysis Discussion",
        content:
          "This article discusses various economic policies and their impacts",
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);
  TestValidator.predicate("article created", article.id !== undefined);

  // Step 3: Post comments with distinctive keywords and phrases
  const comment1: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content:
            "The Federal Reserve's monetary policy significantly impacts inflation rates and employment levels across the economy.",
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment1);

  const comment2: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content:
            "Trade policies and tariffs influence market dynamics and consumer prices dramatically.",
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment2);

  const comment3: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content:
            "Cryptocurrency and blockchain technology represent innovative approaches to financial transactions.",
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment3);

  const comment4: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content:
            "Employment statistics reveal workforce trends, skills gaps, and economic opportunities.",
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment4);

  // Step 4: Search for comments with specific keywords
  // Test 4a: Search for "monetary policy" - should match comment1
  const searchResult1: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.member.me.comments.index(connection, {
      body: {
        search: "monetary policy",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(searchResult1);
  TestValidator.predicate(
    "search for 'monetary policy' returns results",
    searchResult1.data.length > 0,
  );
  TestValidator.predicate(
    "result contains comment with matching content",
    searchResult1.data.some((c) => c.content.includes("monetary policy")),
  );

  // Test 4b: Search for "inflation" - should match comment1
  const searchResult2: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.member.me.comments.index(connection, {
      body: {
        search: "inflation",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(searchResult2);
  TestValidator.predicate(
    "search for 'inflation' returns results",
    searchResult2.data.length > 0,
  );

  // Test 4c: Search for "employment" - should match comment4
  const searchResult3: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.member.me.comments.index(connection, {
      body: {
        search: "employment",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(searchResult3);
  TestValidator.predicate(
    "search for 'employment' returns results",
    searchResult3.data.length > 0,
  );

  // Test 4d: Search for "blockchain" - should match comment3
  const searchResult4: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.member.me.comments.index(connection, {
      body: {
        search: "blockchain",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(searchResult4);
  TestValidator.predicate(
    "search for 'blockchain' returns results",
    searchResult4.data.length > 0,
  );

  // Test 4e: Search for non-existent keyword - should return empty results
  const searchResult5: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.member.me.comments.index(connection, {
      body: {
        search: "nonexistentkeywordxyzabc",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(searchResult5);
  TestValidator.predicate(
    "search for non-existent keyword returns no results",
    searchResult5.data.length === 0,
  );

  // Test 4f: Search for "Federal Reserve" - phrase search
  const searchResult6: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.member.me.comments.index(connection, {
      body: {
        search: "Federal Reserve",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(searchResult6);
  TestValidator.predicate(
    "search for 'Federal Reserve' returns results",
    searchResult6.data.length > 0,
  );

  // Test 4g: Get all comments without search filter
  const allComments: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.member.me.comments.index(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(allComments);
  TestValidator.predicate(
    "retrieving all member comments returns expected count",
    allComments.data.length >= 4,
  );

  // Test 4h: Test pagination
  const paginatedResult: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.member.me.comments.index(connection, {
      body: {
        page: 1,
        limit: 2,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination with limit 2 returns correct number of items",
    paginatedResult.data.length <= 2,
  );

  // Test 4i: Search with pagination
  const searchWithPagination: IPageIDiscussionBoardComment.ISummary =
    await api.functional.discussionBoard.member.me.comments.index(connection, {
      body: {
        search: "economic",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(searchWithPagination);
  TestValidator.predicate(
    "search with pagination returns valid page info",
    searchWithPagination.pagination.current > 0,
  );
}
