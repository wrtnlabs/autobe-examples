import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";

/**
 * Test comment content search functionality.
 *
 * Verifies case-insensitive partial matching on comment content,
 * pagination with search filters, and chronological ordering preservation.
 */
export async function test_api_article_comments_search_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Create an article for testing comments
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {},
  );
  typia.assert(article);
  // 3. Test: Get all comments without search filter (baseline)
  const allCommentsResponse =
    await api.functional.discussionBoard.articles.comments.index(
      userConnection,
      {
        articleId: article.id,
        body: {
          limit: 100,
          page: 1,
          search: null,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(allCommentsResponse);
  // Verify pagination structure exists
  TestValidator.predicate(
    "pagination exists",
    allCommentsResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "data is array",
    Array.isArray(allCommentsResponse.data),
  );
  // 4. Test: Search with specific term - verify case-insensitive matching
  const searchTerms = ["economy", "ECONOMY", "EcOnOmY", "eco"];
  for (const searchTerm of searchTerms) {
    const searchResponse =
      await api.functional.discussionBoard.articles.comments.index(
        userConnection,
        {
          articleId: article.id,
          body: {
            limit: 100,
            page: 1,
            search: searchTerm,
          } satisfies IDiscussionBoardComment.IRequest,
        },
      );
    typia.assert(searchResponse);
    // Verify all returned comments match the search term (case-insensitive)
    for (const comment of searchResponse.data) {
      const matchesSearch = comment.content
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      TestValidator.predicate(
        `comment matches search term '${searchTerm}'`,
        matchesSearch,
      );
    }
    // Verify pagination reflects filtered count
    TestValidator.predicate(
      "filtered count matches data length",
      searchResponse.pagination.records >= searchResponse.data.length,
    );
  }
  // 5. Test: Verify non-matching search returns empty results
  const nonMatchingSearchResponse =
    await api.functional.discussionBoard.articles.comments.index(
      userConnection,
      {
        articleId: article.id,
        body: {
          limit: 100,
          page: 1,
          search: "xyznonexistentterm123",
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(nonMatchingSearchResponse);
  // Should return no matching comments
  TestValidator.predicate(
    "non-matching search returns empty",
    nonMatchingSearchResponse.data.length === 0,
  );
  // 6. Test: Verify empty search string returns all comments
  const emptySearchResponse =
    await api.functional.discussionBoard.articles.comments.index(
      userConnection,
      {
        articleId: article.id,
        body: {
          limit: 100,
          page: 1,
          search: "",
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(emptySearchResponse);
  TestValidator.equals(
    "empty search returns all comments",
    emptySearchResponse.data.length,
    allCommentsResponse.data.length,
  );
  // 7. Test: Verify chronological ordering is preserved
  const orderedResponse =
    await api.functional.discussionBoard.articles.comments.index(
      userConnection,
      {
        articleId: article.id,
        body: {
          limit: 100,
          page: 1,
          search: null,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(orderedResponse);
  // Comments should be ordered by created_at ascending (oldest first)
  for (let i = 1; i < orderedResponse.data.length; i++) {
    const prevComment = orderedResponse.data[i - 1];
    const currComment = orderedResponse.data[i];
    TestValidator.predicate(
      "chronological order preserved",
      new Date(prevComment.created_at) <= new Date(currComment.created_at),
    );
  }
  // 8. Test: Verify pagination with search filter
  const paginatedResponse =
    await api.functional.discussionBoard.articles.comments.index(
      userConnection,
      {
        articleId: article.id,
        body: {
          limit: 5,
          page: 1,
          search: null,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.predicate(
    "pagination limit respected",
    paginatedResponse.data.length <= 5,
  );
  TestValidator.equals(
    "current page is 1",
    paginatedResponse.pagination.current,
    1,
  );
}
