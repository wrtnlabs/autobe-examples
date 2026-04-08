import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test community search pagination and sorting functionality.
 *
 * Validates that the community search endpoint correctly handles pagination parameters (offset, limit, page) and sorting options (name, subscriber_count, created_at) with both ascending and descending orders.
 *
 * This test ensures that pagination metadata accurately reflects the current page position, total record count, and available pages. It also verifies that sorting operations maintain correct order across multiple requests.
 *
 * 1. Search with offset=0, limit=5 to retrieve first page
 * 2. Validate pagination metadata (current=1, limit=5, records count)
 * 3. Search with offset=5, limit=5 to retrieve second page
 * 4. Verify no duplicate communities between pages
 * 5. Test sorting by name ascending (A-Z order)
 * 6. Test sorting by name descending (Z-A order)
 * 7. Test sorting by subscriber_count descending (largest first)
 * 8. Test sorting by created_at descending (newest first)
 * 9. Test page-based pagination (page=2 instead of offset)
 */
export async function test_api_community_search_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: First page with offset=0, limit=5
  const firstPage = await api.functional.redditLike.guest.communities.search(
    connection,
    {
      body: {
        offset: 0,
        limit: 5,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(firstPage);
  // Validate first page pagination metadata
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 5);
  TestValidator.predicate("has records", firstPage.pagination.records >= 0);
  TestValidator.predicate("has pages", firstPage.pagination.pages >= 0);
  TestValidator.predicate(
    "data length within limit",
    firstPage.data.length <= 5,
  );
  // Collect first page community IDs
  const firstPageIds = new Set(firstPage.data.map((c) => c.id));
  // Test 2: Second page with offset=5, limit=5
  const secondPage = await api.functional.redditLike.guest.communities.search(
    connection,
    {
      body: {
        offset: 5,
        limit: 5,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(secondPage);
  // Validate second page pagination metadata
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 5);
  // Test 3: No duplicate communities across pages
  const secondPageIds = new Set(secondPage.data.map((c) => c.id));
  for (const id of secondPageIds) {
    TestValidator.predicate("no duplicate ID", !firstPageIds.has(id));
  }
  // Test 4: Page-based pagination (page=2)
  const pageBased = await api.functional.redditLike.guest.communities.search(
    connection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(pageBased);
  TestValidator.equals("page-based current", pageBased.pagination.current, 2);
  // Test 5: Sorting by name ascending
  const nameAsc = await api.functional.redditLike.guest.communities.search(
    connection,
    {
      body: {
        sort_by: "name",
        sort_order: "asc",
        limit: 10,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(nameAsc);
  // Validate ascending order
  for (let i = 1; i < nameAsc.data.length; i++) {
    TestValidator.predicate(
      `name ascending at index ${i}`,
      nameAsc.data[i - 1].name <= nameAsc.data[i].name,
    );
  }
  // Test 6: Sorting by name descending
  const nameDesc = await api.functional.redditLike.guest.communities.search(
    connection,
    {
      body: {
        sort_by: "name",
        sort_order: "desc",
        limit: 10,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(nameDesc);
  // Validate descending order
  for (let i = 1; i < nameDesc.data.length; i++) {
    TestValidator.predicate(
      `name descending at index ${i}`,
      nameDesc.data[i - 1].name >= nameDesc.data[i].name,
    );
  }
  // Test 7: Sorting by subscriber_count descending
  const subscriberDesc =
    await api.functional.redditLike.guest.communities.search(connection, {
      body: {
        sort_by: "subscriber_count",
        sort_order: "desc",
        limit: 10,
      } satisfies IRedditLikeCommunity.IRequest,
    });
  typia.assert(subscriberDesc);
  // Validate subscriber count descending order
  for (let i = 1; i < subscriberDesc.data.length; i++) {
    TestValidator.predicate(
      `subscriber_count descending at index ${i}`,
      subscriberDesc.data[i - 1].subscriber_count >=
        subscriberDesc.data[i].subscriber_count,
    );
  }
  // Test 8: Sorting by created_at descending
  const createdAtDesc =
    await api.functional.redditLike.guest.communities.search(connection, {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
        limit: 10,
      } satisfies IRedditLikeCommunity.IRequest,
    });
  typia.assert(createdAtDesc);
  // Validate created_at descending order (newest first)
  for (let i = 1; i < createdAtDesc.data.length; i++) {
    TestValidator.predicate(
      `created_at descending at index ${i}`,
      createdAtDesc.data[i - 1].created_at >= createdAtDesc.data[i].created_at,
    );
  }
}
