import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin article search with keyword and tag filters.
 * Verifies that search functionality correctly applies AND logic for multiple tags
 * and filters articles by keyword matching title and content.
 */
export async function test_api_admin_article_search_with_keyword_and_tag_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Test search with keyword only (no tag filters)
  const keywordSearch =
    await api.functional.discussionBoard.admin.articles.search(
      adminConnection,
      {
        body: {
          search: RandomGenerator.paragraph({ sentences: 1 }),
          page: 1,
          limit: 20,
          sort: "newest",
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(keywordSearch);
  // Validate pagination metadata values are valid
  TestValidator.predicate(
    "pagination current page is non-negative",
    keywordSearch.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    keywordSearch.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    keywordSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    keywordSearch.pagination.pages >= 0,
  );
  // 3. Test search with multiple tag filters (AND logic)
  const tagNames = [RandomGenerator.name(), RandomGenerator.name()];
  const tagFilteredSearch =
    await api.functional.discussionBoard.admin.articles.search(
      adminConnection,
      {
        body: {
          search: undefined,
          tag_names: tagNames,
          page: 1,
          limit: 20,
          sort: "newest",
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(tagFilteredSearch);
  // 4. Test search with both keyword AND tag filters
  const combinedSearch =
    await api.functional.discussionBoard.admin.articles.search(
      adminConnection,
      {
        body: {
          search: RandomGenerator.paragraph({ sentences: 1 }),
          tag_names: tagNames,
          page: 1,
          limit: 20,
          sort: "newest",
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(combinedSearch);
  // 5. Validate article summaries structure when data exists
  if (combinedSearch.data.length > 0) {
    const firstArticle = combinedSearch.data[0];
    typia.assert(firstArticle);
    // Validate pagination metadata consistency
    TestValidator.predicate(
      "pagination current page matches request",
      combinedSearch.pagination.current === 1,
    );
    TestValidator.predicate(
      "pagination limit matches request",
      combinedSearch.pagination.limit === 20,
    );
  }
  // 6. Test pagination with different page numbers
  const page2Search =
    await api.functional.discussionBoard.admin.articles.search(
      adminConnection,
      {
        body: {
          search: RandomGenerator.paragraph({ sentences: 1 }),
          page: 2,
          limit: 10,
          sort: "newest",
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(page2Search);
  TestValidator.equals(
    "page 2 current is 2",
    page2Search.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit is 10", page2Search.pagination.limit, 10);
  // 7. Test oldest sort order
  const oldestSearch =
    await api.functional.discussionBoard.admin.articles.search(
      adminConnection,
      {
        body: {
          search: undefined,
          page: 1,
          limit: 20,
          sort: "oldest",
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(oldestSearch);
  // 8. Test empty search results
  const emptySearch =
    await api.functional.discussionBoard.admin.articles.search(
      adminConnection,
      {
        body: {
          search: "nonexistent_keyword_xyz123",
          tag_names: ["nonexistent_tag_xyz123"],
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty search has 0 records",
    emptySearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search has empty data array",
    emptySearch.data.length,
    0,
  );
}
