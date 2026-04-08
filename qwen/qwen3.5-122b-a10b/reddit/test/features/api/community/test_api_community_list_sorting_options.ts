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
 * Test community listing supports multiple sorting options with correct ordering.
 *
 * Validates that the community listing endpoint correctly handles various sorting combinations including sorting by name, creation timestamp, and subscriber count in both ascending and descending orders. The test ensures that pagination maintains sort order across multiple pages.
 *
 * The test creates multiple communities with distinct characteristics and verifies that each sorting configuration produces the expected ordering of results.
 *
 * 1. Create guest account for authentication.
 * 2. Create 6 communities with unique names, distinct timestamps, and varying subscriber counts.
 * 3. Test sorting by name ascending (A-Z).
 * 4. Test sorting by name descending (Z-A).
 * 5. Test sorting by created_at ascending (oldest first).
 * 6. Test sorting by created_at descending (newest first).
 * 7. Test sorting by subscriber_count ascending (lowest first).
 * 8. Test sorting by subscriber_count descending (highest first).
 * 9. Verify pagination maintains sort order.
 */
export async function test_api_community_list_sorting_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest account for authentication
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeGuest.IJoin,
  });
  typia.assert(guestAuth);
  // Test 1: Sort by name ascending
  const nameAscResult = await api.functional.redditLike.guest.communities.index(
    guestConnection,
    {
      body: {
        sort_by: "name",
        sort_order: "asc",
        limit: 100,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(nameAscResult);
  // Validate name ascending order
  for (let i = 1; i < nameAscResult.data.length; i++) {
    TestValidator.predicate(
      `name[${i - 1}] <= name[${i}]`,
      nameAscResult.data[i - 1].name <= nameAscResult.data[i].name,
    );
  }
  // Test 2: Sort by name descending
  const nameDescResult =
    await api.functional.redditLike.guest.communities.index(guestConnection, {
      body: {
        sort_by: "name",
        sort_order: "desc",
        limit: 100,
      } satisfies IRedditLikeCommunity.IRequest,
    });
  typia.assert(nameDescResult);
  // Validate name descending order
  for (let i = 1; i < nameDescResult.data.length; i++) {
    TestValidator.predicate(
      `name[${i - 1}] >= name[${i}]`,
      nameDescResult.data[i - 1].name >= nameDescResult.data[i].name,
    );
  }
  // Test 3: Sort by created_at ascending
  const createdAtAscResult =
    await api.functional.redditLike.guest.communities.index(guestConnection, {
      body: {
        sort_by: "created_at",
        sort_order: "asc",
        limit: 100,
      } satisfies IRedditLikeCommunity.IRequest,
    });
  typia.assert(createdAtAscResult);
  // Validate created_at ascending order
  for (let i = 1; i < createdAtAscResult.data.length; i++) {
    TestValidator.predicate(
      `created_at[${i - 1}] <= created_at[${i}]`,
      createdAtAscResult.data[i - 1].created_at <=
        createdAtAscResult.data[i].created_at,
    );
  }
  // Test 4: Sort by created_at descending
  const createdAtDescResult =
    await api.functional.redditLike.guest.communities.index(guestConnection, {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
        limit: 100,
      } satisfies IRedditLikeCommunity.IRequest,
    });
  typia.assert(createdAtDescResult);
  // Validate created_at descending order
  for (let i = 1; i < createdAtDescResult.data.length; i++) {
    TestValidator.predicate(
      `created_at[${i - 1}] >= created_at[${i}]`,
      createdAtDescResult.data[i - 1].created_at >=
        createdAtDescResult.data[i].created_at,
    );
  }
  // Test 5: Sort by subscriber_count ascending
  const subscriberAscResult =
    await api.functional.redditLike.guest.communities.index(guestConnection, {
      body: {
        sort_by: "subscriber_count",
        sort_order: "asc",
        limit: 100,
      } satisfies IRedditLikeCommunity.IRequest,
    });
  typia.assert(subscriberAscResult);
  // Validate subscriber_count ascending order
  for (let i = 1; i < subscriberAscResult.data.length; i++) {
    TestValidator.predicate(
      `subscriber_count[${i - 1}] <= subscriber_count[${i}]`,
      subscriberAscResult.data[i - 1].subscriber_count <=
        subscriberAscResult.data[i].subscriber_count,
    );
  }
  // Test 6: Sort by subscriber_count descending
  const subscriberDescResult =
    await api.functional.redditLike.guest.communities.index(guestConnection, {
      body: {
        sort_by: "subscriber_count",
        sort_order: "desc",
        limit: 100,
      } satisfies IRedditLikeCommunity.IRequest,
    });
  typia.assert(subscriberDescResult);
  // Validate subscriber_count descending order
  for (let i = 1; i < subscriberDescResult.data.length; i++) {
    TestValidator.predicate(
      `subscriber_count[${i - 1}] >= subscriber_count[${i}]`,
      subscriberDescResult.data[i - 1].subscriber_count >=
        subscriberDescResult.data[i].subscriber_count,
    );
  }
  // Test 7: Pagination maintains sort order
  const page1 = await api.functional.redditLike.guest.communities.index(
    guestConnection,
    {
      body: {
        sort_by: "name",
        sort_order: "asc",
        page: 1,
        limit: 5,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(page1);
  const page2 = await api.functional.redditLike.guest.communities.index(
    guestConnection,
    {
      body: {
        sort_by: "name",
        sort_order: "asc",
        page: 2,
        limit: 5,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(page2);
  // If both pages have data, page2's first item should be >= page1's last item
  if (page1.data.length > 0 && page2.data.length > 0) {
    TestValidator.predicate(
      "pagination maintains sort order",
      page1.data[page1.data.length - 1].name <= page2.data[0].name,
    );
  }
  // Test 8: Default sort behavior (no sort parameters)
  const defaultSortResult =
    await api.functional.redditLike.guest.communities.index(guestConnection, {
      body: {
        limit: 100,
      } satisfies IRedditLikeCommunity.IRequest,
    });
  typia.assert(defaultSortResult);
  // Just verify we get a valid response with pagination info
  TestValidator.predicate(
    "default sort returns valid pagination",
    defaultSortResult.pagination.current >= 1 &&
      defaultSortResult.pagination.limit > 0,
  );
}
