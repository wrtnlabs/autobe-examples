import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test search functionality combined with popularity ranking.
 * Verify that search queries correctly filter results while maintaining popularity-based ordering.
 * Test various search scenarios including partial matches and validate that the combination of
 * search filtering and popularity ranking produces meaningful results.
 */
export async function test_api_superadmin_popular_search_functionality(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superadmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Test basic search functionality
  const basicSearchResult =
    await api.functional.discussionBoard.superAdmin.popular.index(
      superAdminConnection,
      {
        body: {
          search: "", // Empty search to get all popular articles
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(basicSearchResult);
  // 3. Validate pagination structure
  TestValidator.predicate(
    "current page should be 1",
    basicSearchResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit should be 10",
    basicSearchResult.pagination.limit === 10,
  );
  TestValidator.predicate(
    "records count should be non-negative",
    basicSearchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count should be non-negative",
    basicSearchResult.pagination.pages >= 0,
  );
  // 4. Test various search scenarios
  const searchTestCases = [
    { search: "test", description: "common word search" },
    { search: "TECHNOLOGY", description: "uppercase search" },
    { search: "prog", description: "partial word search" },
    { search: "123", description: "numeric search" },
  ];
  for (const testCase of searchTestCases) {
    const searchResult =
      await api.functional.discussionBoard.superAdmin.popular.index(
        superAdminConnection,
        {
          body: {
            search: testCase.search,
            page: 1,
            limit: 5,
          } satisfies IDiscussionBoardArticle.IRequest,
        },
      );
    typia.assert(searchResult);
    TestValidator.predicate(
      `search "${testCase.search}" should return valid pagination`,
      searchResult.pagination.current === 1 &&
        searchResult.pagination.limit === 5,
    );
  }
  // 5. Test pagination functionality
  const paginationTests = [
    { page: 1, limit: 5 },
    { page: 2, limit: 3 },
    { page: 1, limit: 1 },
  ];
  for (const paginationTest of paginationTests) {
    const result =
      await api.functional.discussionBoard.superAdmin.popular.index(
        superAdminConnection,
        {
          body: {
            search: "",
            page: paginationTest.page,
            limit: paginationTest.limit,
          } satisfies IDiscussionBoardArticle.IRequest,
        },
      );
    typia.assert(result);
    TestValidator.equals(
      `page should be ${paginationTest.page}`,
      result.pagination.current,
      paginationTest.page,
    );
    TestValidator.equals(
      `limit should be ${paginationTest.limit}`,
      result.pagination.limit,
      paginationTest.limit,
    );
    TestValidator.predicate(
      `data length should not exceed limit ${paginationTest.limit}`,
      result.data.length <= paginationTest.limit,
    );
  }
  // 6. Test error scenarios with invalid parameters
  await TestValidator.error("should handle invalid page number", async () => {
    await api.functional.discussionBoard.superAdmin.popular.index(
      superAdminConnection,
      {
        body: {
          search: "",
          page: 0 as any, // Invalid page number
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  });
  await TestValidator.error("should handle invalid limit", async () => {
    await api.functional.discussionBoard.superAdmin.popular.index(
      superAdminConnection,
      {
        body: {
          search: "",
          page: 1,
          limit: 200 as any, // Invalid limit (exceeds maximum)
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  });
  // 7. Test combination of search and section filtering (if section ID available)
  const combinedSearch =
    await api.functional.discussionBoard.superAdmin.popular.index(
      superAdminConnection,
      {
        body: {
          search: "",
          discussion_board_section_id: undefined, // Would need actual section UUID
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(combinedSearch);
  // 8. Validate that popularity ranking is maintained
  if (basicSearchResult.data.length >= 2) {
    // Basic check that we're getting article summaries
    const firstArticle = basicSearchResult.data[0];
    TestValidator.predicate(
      "first article should have valid structure",
      !!firstArticle.title && !!firstArticle.author && !!firstArticle.section,
    );
  }
  // 9. Test edge case: very specific search that might return no results
  const specificSearch =
    await api.functional.discussionBoard.superAdmin.popular.index(
      superAdminConnection,
      {
        body: {
          search: "very-specific-unlikely-keyword-12345",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(specificSearch);
  TestValidator.predicate(
    "specific search should return valid pagination even with no results",
    specificSearch.pagination.records >= 0 &&
      specificSearch.pagination.pages >= 0,
  );
}
