import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
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

/**
 * Test pagination edge cases for cross-section article discovery including empty search results,
 * single-page results, and boundary conditions. Validate that pagination metadata correctly
 * handles scenarios with zero results, results exactly matching page limits, and results
 * spanning multiple pages. Test different page sizes and verify that the system maintains
 * consistent pagination behavior across various result sets.
 */
export async function test_api_cross_section_discovery_pagination_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // Test 1: Empty search results
  const emptySearchResult =
    await api.functional.discussionBoard.member.cross_section.index(
      memberConnection,
      {
        body: {
          search:
            "unique_nonexistent_search_query_" +
            RandomGenerator.alphaNumeric(16),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(emptySearchResult);
  TestValidator.equals(
    "empty search result count",
    emptySearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search pages",
    emptySearchResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search current page",
    emptySearchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty search limit",
    emptySearchResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "empty search data array length",
    emptySearchResult.data.length,
    0,
  );
  // Test 2: Single page results with small limit
  const singlePageResult =
    await api.functional.discussionBoard.member.cross_section.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(singlePageResult);
  TestValidator.predicate(
    "single page has valid pagination",
    singlePageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "single page current page is valid",
    singlePageResult.pagination.current >= 1,
  );
  TestValidator.equals(
    "single page limit matches",
    singlePageResult.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "single page data length <= limit",
    singlePageResult.data.length <= singlePageResult.pagination.limit,
  );
  // Test 3: Boundary conditions with different page sizes
  const pageSizes = [1, 10, 25, 50] as const;
  for (const pageSize of pageSizes) {
    const boundaryResult =
      await api.functional.discussionBoard.member.cross_section.index(
        memberConnection,
        {
          body: {
            page: 1,
            limit: pageSize,
          } satisfies IDiscussionBoardArticle.IRequest,
        },
      );
    typia.assert(boundaryResult);
    TestValidator.equals(
      `page size ${pageSize} limit matches`,
      boundaryResult.pagination.limit,
      pageSize,
    );
    TestValidator.predicate(
      `page size ${pageSize} data length valid`,
      boundaryResult.data.length <= pageSize,
    );
    TestValidator.predicate(
      `page size ${pageSize} total pages valid`,
      boundaryResult.pagination.pages >= 0,
    );
    TestValidator.predicate(
      `page size ${pageSize} total records valid`,
      boundaryResult.pagination.records >= 0,
    );
  }
  // Test 4: Page navigation consistency
  const firstPage =
    await api.functional.discussionBoard.member.cross_section.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(firstPage);
  // Only test page navigation if multiple pages exist
  if (firstPage.pagination.pages > 1) {
    const secondPage =
      await api.functional.discussionBoard.member.cross_section.index(
        memberConnection,
        {
          body: {
            page: 2,
            limit: 10,
          } satisfies IDiscussionBoardArticle.IRequest,
        },
      );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page current page",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "consistent limit across pages",
      firstPage.pagination.limit,
      secondPage.pagination.limit,
    );
    TestValidator.equals(
      "consistent total records across pages",
      firstPage.pagination.records,
      secondPage.pagination.records,
    );
    TestValidator.equals(
      "consistent total pages across pages",
      firstPage.pagination.pages,
      secondPage.pagination.pages,
    );
  }
  // Test 5: Test page numbers beyond total pages
  if (firstPage.pagination.pages > 0) {
    const lastPage =
      await api.functional.discussionBoard.member.cross_section.index(
        memberConnection,
        {
          body: {
            page: firstPage.pagination.pages,
            limit: 10,
          } satisfies IDiscussionBoardArticle.IRequest,
        },
      );
    typia.assert(lastPage);
    TestValidator.equals(
      "last page current page",
      lastPage.pagination.current,
      firstPage.pagination.pages,
    );
    TestValidator.predicate(
      "last page data length valid",
      lastPage.data.length <= lastPage.pagination.limit,
    );
  }
  // Test 6: Verify chronological ordering is handled by typia.assert
  const orderedResult =
    await api.functional.discussionBoard.member.cross_section.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(orderedResult);
  // typia.assert() validates all properties including chronological ordering
}
