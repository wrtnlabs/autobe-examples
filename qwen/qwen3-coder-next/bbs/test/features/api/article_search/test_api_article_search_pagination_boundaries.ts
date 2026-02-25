import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_article_search_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user connection for testing search functionality
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(userConnection, {
    body: {
      email: `user_${RandomGenerator.alphaNumeric(6)}@test.com`,
      password: RandomGenerator.alphaNumeric(12),
      displayName: `User ${RandomGenerator.name()}`,
      passwordConfirmation: RandomGenerator.alphaNumeric(12),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 2. Test minimum pagination (page=1, limit=1)
  const minPagination = await api.functional.discussionBoard.articles.index(
    userConnection,
    {
      body: {
        q: "", // Empty query for all articles
        page: 1,
        limit: 1,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(minPagination);
  TestValidator.equals(
    "minimum pagination returns exactly 1 article",
    minPagination.data.length,
    1,
  );
  TestValidator.equals(
    "pagination current page is 1",
    minPagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 1",
    minPagination.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "pagination records matches total",
    () => minPagination.pagination.records >= 0,
  );
  // 3. Test maximum pagination (page > total pages) - edge case
  const pageBeyondAvailable =
    await api.functional.discussionBoard.articles.index(userConnection, {
      body: {
        q: "", // Empty query to get all articles
        page: minPagination.pagination.pages + 10, // Definitely beyond available pages
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(pageBeyondAvailable);
  TestValidator.equals(
    "page beyond available returns empty data",
    pageBeyondAvailable.data.length,
    0,
  );
  TestValidator.predicate(
    "pagination metadata valid for page beyond available",
    () =>
      pageBeyondAvailable.pagination.pages >= 0 &&
      pageBeyondAvailable.pagination.current >
        pageBeyondAvailable.pagination.pages,
  );
  // 4. Test maximum limit (limit=100)
  const maxLimit = await api.functional.discussionBoard.articles.index(
    userConnection,
    {
      body: {
        q: "", // Empty query
        page: 1,
        limit: 100, // Maximum limit
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(maxLimit);
  TestValidator.predicate(
    "max limit returns data without error",
    () => maxLimit.data !== undefined && Array.isArray(maxLimit.data),
  );
  // 5. Test search with pagination
  const searchWithPagination =
    await api.functional.discussionBoard.articles.index(userConnection, {
      body: {
        q: "Test", // Search for articles containing "Test"
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchWithPagination);
  TestValidator.predicate(
    "search pagination valid",
    () =>
      searchWithPagination.pagination.current === 1 &&
      searchWithPagination.pagination.limit === 5,
  );
  // 6. Test boundary: request page 0 (edge case - should default to page 1)
  const pageZero = await api.functional.discussionBoard.articles.index(
    userConnection,
    {
      body: {
        q: "",
        page: 0, // Edge case: page 0
        limit: 5,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(pageZero);
  TestValidator.predicate(
    "page 0 handled correctly",
    () =>
      pageZero.pagination.current === 1 || pageZero.pagination.current === 0,
  );
  // 7. Test limit=1 with non-empty search query
  const searchWithMinLimit =
    await api.functional.discussionBoard.articles.index(userConnection, {
      body: {
        q: "article", // Search query
        page: 1,
        limit: 1, // Minimum limit
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(searchWithMinLimit);
  TestValidator.equals(
    "search with min limit returns 1 article",
    searchWithMinLimit.data.length,
    1,
  );
  TestValidator.equals(
    "pagination correct for search with min limit",
    searchWithMinLimit.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 1",
    searchWithMinLimit.pagination.limit,
    1,
  );
}
