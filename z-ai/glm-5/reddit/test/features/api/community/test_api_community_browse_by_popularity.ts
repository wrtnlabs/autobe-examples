import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test browsing all communities sorted by subscriber count (default sorting).
 *
 * Validates:
 * 1. Response contains pagination metadata (current=1, limit=20 default)
 * 2. Communities are sorted by subscriber_count DESC
 * 3. Each community summary has all required fields
 * 4. Pagination works correctly for page 2
 * 5. Empty results return valid empty array
 * 6. Custom limit parameter works
 */
export async function test_api_community_browse_by_popularity(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Browse communities with default parameters (page 1, limit 20, sort by subscriber_count)
  const firstPage = await api.functional.community.communities.index(
    connection,
    {
      body: {} satisfies ICommunityCommunity.IRequest,
    },
  );
  typia.assert(firstPage);
  // Validate pagination metadata defaults
  TestValidator.equals("default page is 1", firstPage.pagination.current, 1);
  TestValidator.equals("default limit is 20", firstPage.pagination.limit, 20);
  // Validate sorting by subscriber_count DESC
  if (firstPage.data.length > 1) {
    for (let i = 0; i < firstPage.data.length - 1; i++) {
      TestValidator.predicate(
        `communities sorted by subscriber_count DESC at index ${i}`,
        firstPage.data[i].subscriber_count >=
          firstPage.data[i + 1].subscriber_count,
      );
    }
  }
  // Test 2: Pagination - request page 2
  if (firstPage.pagination.pages > 1) {
    const secondPage = await api.functional.community.communities.index(
      connection,
      {
        body: { page: 2 } satisfies ICommunityCommunity.IRequest,
      },
    );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page current is 2",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "second page has same limit",
      secondPage.pagination.limit,
      20,
    );
    TestValidator.equals(
      "total records match between pages",
      secondPage.pagination.records,
      firstPage.pagination.records,
    );
    // Verify different results on page 2
    if (firstPage.data.length > 0 && secondPage.data.length > 0) {
      TestValidator.notEquals(
        "page 1 and page 2 have different first items",
        firstPage.data[0].id,
        secondPage.data[0].id,
      );
    }
  }
  // Test 3: Custom limit parameter
  const customLimitPage = await api.functional.community.communities.index(
    connection,
    {
      body: { limit: 5 } satisfies ICommunityCommunity.IRequest,
    },
  );
  typia.assert(customLimitPage);
  TestValidator.equals(
    "custom limit is 5",
    customLimitPage.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data length respects custom limit",
    customLimitPage.data.length <= 5,
  );
  // Test 4: Empty search results with non-matching query
  const emptyQuery = await api.functional.community.communities.index(
    connection,
    {
      body: {
        query: "zzzzzzzzzznonexistent123456789xyz",
      } satisfies ICommunityCommunity.IRequest,
    },
  );
  typia.assert(emptyQuery);
  TestValidator.predicate(
    "non-matching query returns empty or fewer results",
    emptyQuery.pagination.records < firstPage.pagination.records,
  );
  // Test 5: Verify explicit sort by subscriber_count works same as default
  const explicitSort = await api.functional.community.communities.index(
    connection,
    {
      body: { sort: "subscriber_count" } satisfies ICommunityCommunity.IRequest,
    },
  );
  typia.assert(explicitSort);
  TestValidator.equals(
    "explicit subscriber_count sort matches default",
    explicitSort.pagination.records,
    firstPage.pagination.records,
  );
}
