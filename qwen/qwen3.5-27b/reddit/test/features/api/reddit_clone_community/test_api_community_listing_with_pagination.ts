import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test community listing with pagination functionality.
 *
 * This test validates:
 * 1. Basic community listing with pagination parameters
 * 2. Pagination metadata correctness (current, limit, records, pages)
 * 3. Community summary data structure validation
 * 4. Default alphabetical sorting by name
 * 5. Multiple page navigation
 * 6. Pagination boundary conditions
 */
export async function test_api_community_listing_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test page 1 with pageSize=10
  const page1Body = {
    page: 1,
    pageSize: 10,
  } satisfies IRedditCloneCommunity.IRequest;
  const page1Response = await api.functional.redditClone.communities.index(
    connection,
    {
      body: page1Body,
    },
  );
  typia.assert(page1Response);
  // Verify pagination metadata for page 1
  TestValidator.equals(
    "current page is 1",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals("page limit is 10", page1Response.pagination.limit, 10);
  TestValidator.predicate(
    "records count is non-negative",
    page1Response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    page1Response.pagination.pages >= 0,
  );
  // Verify pages calculation: pages = ceil(records / limit)
  const expectedPages = Math.ceil(
    page1Response.pagination.records / page1Response.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation is correct",
    page1Response.pagination.pages,
    expectedPages,
  );
  // Verify data array structure
  TestValidator.predicate(
    "data array exists",
    Array.isArray(page1Response.data),
  );
  TestValidator.predicate(
    "data array length matches limit or less",
    page1Response.data.length <= page1Response.pagination.limit,
  );
  // Verify each community summary has required fields
  for (const community of page1Response.data) {
    TestValidator.predicate(
      `community ${community.id} has valid UUID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        community.id,
      ),
    );
    TestValidator.predicate(
      `community ${community.id} has valid name length`,
      community.name.length >= 3 && community.name.length <= 50,
    );
    TestValidator.predicate(
      `community ${community.id} has non-negative subscriber count`,
      community.subscriber_count >= 0,
    );
    TestValidator.predicate(
      `community ${community.id} has valid created_at`,
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(community.created_at),
    );
    TestValidator.predicate(
      `community ${community.id} has owner`,
      community.owner !== null && community.owner !== undefined,
    );
    TestValidator.predicate(
      `community ${community.id} owner has username`,
      community.owner.username.length > 0,
    );
  }
  // Verify default alphabetical sorting by name (ascending)
  if (page1Response.data.length > 1) {
    for (let i = 1; i < page1Response.data.length; i++) {
      TestValidator.predicate(
        `communities sorted alphabetically at index ${i}`,
        page1Response.data[i - 1].name.localeCompare(
          page1Response.data[i].name,
        ) <= 0,
      );
    }
  }
  // Test page 2 if there are enough records
  if (page1Response.pagination.pages >= 2) {
    const page2Body = {
      page: 2,
      pageSize: 10,
    } satisfies IRedditCloneCommunity.IRequest;
    const page2Response = await api.functional.redditClone.communities.index(
      connection,
      {
        body: page2Body,
      },
    );
    typia.assert(page2Response);
    // Verify pagination metadata for page 2
    TestValidator.equals(
      "page 2 current is 2",
      page2Response.pagination.current,
      2,
    );
    TestValidator.equals(
      "page 2 limit is 10",
      page2Response.pagination.limit,
      10,
    );
    TestValidator.equals(
      "page 2 records matches page 1",
      page2Response.pagination.records,
      page1Response.pagination.records,
    );
    TestValidator.equals(
      "page 2 pages matches page 1",
      page2Response.pagination.pages,
      page1Response.pagination.pages,
    );
    // Verify page 2 has different communities than page 1
    const page1Ids = new Set(page1Response.data.map((c) => c.id));
    const page2Ids = new Set(page2Response.data.map((c) => c.id));
    const hasOverlap = Array.from(page1Ids).some((id) => page2Ids.has(id));
    TestValidator.predicate(
      "page 2 has different communities than page 1",
      !hasOverlap,
    );
    // Verify page 2 data structure
    TestValidator.predicate(
      "page 2 data array exists",
      Array.isArray(page2Response.data),
    );
    TestValidator.predicate(
      "page 2 data array length is valid",
      page2Response.data.length <= page2Response.pagination.limit,
    );
  }
  // Test last page boundary
  if (page1Response.pagination.pages > 0) {
    const lastPageBody = {
      page: page1Response.pagination.pages,
      pageSize: 10,
    } satisfies IRedditCloneCommunity.IRequest;
    const lastPageResponse = await api.functional.redditClone.communities.index(
      connection,
      {
        body: lastPageBody,
      },
    );
    typia.assert(lastPageResponse);
    // Verify last page current matches expected
    TestValidator.equals(
      "last page current is correct",
      lastPageResponse.pagination.current,
      page1Response.pagination.pages,
    );
    // Verify last page has fewer or equal items than limit
    TestValidator.predicate(
      "last page data length is valid",
      lastPageResponse.data.length <= lastPageResponse.pagination.limit,
    );
    // Verify last page data length matches expected remainder
    const expectedLastPageCount =
      page1Response.pagination.records % page1Response.pagination.limit === 0
        ? page1Response.pagination.limit
        : page1Response.pagination.records % page1Response.pagination.limit;
    TestValidator.equals(
      "last page data length matches expected",
      lastPageResponse.data.length,
      expectedLastPageCount,
    );
  }
}
