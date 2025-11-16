import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test pagination behavior in community listings to ensure efficient navigation
 * through large sets of communities.
 *
 * This test validates:
 *
 * 1. Creating sufficient communities for pagination testing (15 communities)
 * 2. First page retrieval with specific limit
 * 3. Subsequent page navigation
 * 4. Boundary conditions (first page, last page, beyond last page)
 * 5. Pagination metadata accuracy
 * 6. Different page sizes
 *
 * Business logic:
 *
 * - Page numbering starts at 1
 * - Limit parameter controls page size (1-100)
 * - Results are non-overlapping across pages
 * - Last page may have fewer items than limit
 * - Pagination metadata must be accurate
 * - Total pages = ceiling(total records / limit)
 */
export async function test_api_community_discovery_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated moderator
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "testPassword123!",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create 15 communities for pagination testing
  const communityCount = 15;
  const createdCommunities: IRedditCommunityCommunity[] =
    await ArrayUtil.asyncRepeat(communityCount, async (index) => {
      const community: IRedditCommunityCommunity =
        await api.functional.redditCommunity.moderator.communities.create(
          connection,
          {
            body: {
              name: `testcommunity${index}_${RandomGenerator.alphaNumeric(8)}`,
              display_title: `Test Community ${index + 1}`,
              description: RandomGenerator.paragraph({ sentences: 5 }),
              rules: RandomGenerator.paragraph({ sentences: 3 }),
            } satisfies IRedditCommunityCommunity.ICreate,
          },
        );
      typia.assert(community);
      return community;
    });

  TestValidator.equals(
    "created communities count",
    createdCommunities.length,
    communityCount,
  );

  // Step 3: Test first page with limit=5
  const pageSize = 5;
  const firstPage: IPageIRedditCommunityCommunity.ISummary =
    await api.functional.redditCommunity.communities.index(connection, {
      body: {
        page: 1,
        limit: pageSize,
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(firstPage);

  // Validate first page metadata
  TestValidator.equals("first page current", firstPage.pagination.current, 0);
  TestValidator.equals(
    "first page limit",
    firstPage.pagination.limit,
    pageSize,
  );
  TestValidator.predicate(
    "first page has data",
    firstPage.data.length > 0 && firstPage.data.length <= pageSize,
  );
  TestValidator.predicate(
    "total records >= created communities",
    firstPage.pagination.records >= communityCount,
  );

  // Calculate expected total pages
  const expectedPages = Math.ceil(firstPage.pagination.records / pageSize);
  TestValidator.equals(
    "total pages calculation",
    firstPage.pagination.pages,
    expectedPages,
  );

  // Step 4: Test second page
  const secondPage: IPageIRedditCommunityCommunity.ISummary =
    await api.functional.redditCommunity.communities.index(connection, {
      body: {
        page: 2,
        limit: pageSize,
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(secondPage);

  // Validate second page metadata
  TestValidator.equals("second page current", secondPage.pagination.current, 1);
  TestValidator.equals(
    "second page limit",
    secondPage.pagination.limit,
    pageSize,
  );
  TestValidator.equals(
    "records count consistent",
    secondPage.pagination.records,
    firstPage.pagination.records,
  );

  // Verify no overlapping results between first and second page
  const firstPageIds = firstPage.data.map((c) => c.id);
  const secondPageIds = secondPage.data.map((c) => c.id);
  const hasOverlap = firstPageIds.some((id) => secondPageIds.includes(id));
  TestValidator.predicate("no overlapping results", !hasOverlap);

  // Step 5: Test last page
  const lastPageNumber = firstPage.pagination.pages;
  const lastPage: IPageIRedditCommunityCommunity.ISummary =
    await api.functional.redditCommunity.communities.index(connection, {
      body: {
        page: lastPageNumber,
        limit: pageSize,
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(lastPage);

  TestValidator.equals(
    "last page current",
    lastPage.pagination.current,
    lastPageNumber - 1,
  );
  TestValidator.predicate(
    "last page may have fewer items",
    lastPage.data.length <= pageSize && lastPage.data.length > 0,
  );

  // Step 6: Test page beyond total pages
  const beyondPage: IPageIRedditCommunityCommunity.ISummary =
    await api.functional.redditCommunity.communities.index(connection, {
      body: {
        page: lastPageNumber + 5,
        limit: pageSize,
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(beyondPage);

  TestValidator.predicate(
    "beyond page returns empty or last valid page",
    beyondPage.data.length === 0 ||
      beyondPage.pagination.current === lastPageNumber - 1,
  );

  // Step 7: Test different page size (limit=10)
  const differentPageSize = 10;
  const differentLimitPage: IPageIRedditCommunityCommunity.ISummary =
    await api.functional.redditCommunity.communities.index(connection, {
      body: {
        page: 1,
        limit: differentPageSize,
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(differentLimitPage);

  TestValidator.equals(
    "different limit applied",
    differentLimitPage.pagination.limit,
    differentPageSize,
  );
  TestValidator.predicate(
    "different limit page data count",
    differentLimitPage.data.length <= differentPageSize,
  );

  const expectedPagesWithDifferentLimit = Math.ceil(
    differentLimitPage.pagination.records / differentPageSize,
  );
  TestValidator.equals(
    "pages recalculated with different limit",
    differentLimitPage.pagination.pages,
    expectedPagesWithDifferentLimit,
  );

  // Step 8: Test minimum page size (limit=1)
  const minPageSize = 1;
  const minLimitPage: IPageIRedditCommunityCommunity.ISummary =
    await api.functional.redditCommunity.communities.index(connection, {
      body: {
        page: 1,
        limit: minPageSize,
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(minLimitPage);

  TestValidator.equals(
    "minimum limit applied",
    minLimitPage.pagination.limit,
    minPageSize,
  );
  TestValidator.predicate(
    "minimum limit returns single item",
    minLimitPage.data.length <= minPageSize,
  );

  // Step 9: Test maximum page size (limit=100)
  const maxPageSize = 100;
  const maxLimitPage: IPageIRedditCommunityCommunity.ISummary =
    await api.functional.redditCommunity.communities.index(connection, {
      body: {
        page: 1,
        limit: maxPageSize,
      } satisfies IRedditCommunityCommunity.IRequest,
    });
  typia.assert(maxLimitPage);

  TestValidator.equals(
    "maximum limit applied",
    maxLimitPage.pagination.limit,
    maxPageSize,
  );
  TestValidator.predicate(
    "maximum limit respects boundary",
    maxLimitPage.data.length <= maxPageSize,
  );
}
