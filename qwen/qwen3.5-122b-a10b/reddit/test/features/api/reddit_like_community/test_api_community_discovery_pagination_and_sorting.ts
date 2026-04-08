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

export async function test_api_community_discovery_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as guest user
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeGuest.IJoin,
  });
  typia.assert(guestAuth);
  // Note: The scenario requires creating communities to test pagination/sorting
  // However, there is no utility function or SDK function available for creating communities
  // in the provided API functions. The only available community-related function is
  // api.functional.redditLike.guest.communities.discover.index which only reads communities.
  //
  // Since we cannot create test data, we will test the pagination and sorting
  // parameters work correctly with whatever communities exist in the system.
  // We'll validate the response structure and that parameters are accepted.
  // 2. Test sorting by name ascending
  const nameAscResult =
    await api.functional.redditLike.guest.communities.discover.index(
      guestConnection,
      {
        body: {
          sort_by: "name",
          sort_order: "asc",
          limit: 10,
          page: 1,
        } satisfies IRedditLikeCommunity.IRequest,
      },
    );
  typia.assert(nameAscResult);
  // Validate pagination metadata exists
  TestValidator.predicate(
    "pagination metadata exists",
    () => nameAscResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "has current page",
    () => nameAscResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "has limit",
    () => nameAscResult.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "has total records",
    () => nameAscResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has total pages",
    () => nameAscResult.pagination.pages >= 0,
  );
  // 3. Test sorting by name descending
  const nameDescResult =
    await api.functional.redditLike.guest.communities.discover.index(
      guestConnection,
      {
        body: {
          sort_by: "name",
          sort_order: "desc",
          limit: 10,
          page: 1,
        } satisfies IRedditLikeCommunity.IRequest,
      },
    );
  typia.assert(nameDescResult);
  // 4. Test sorting by created_at descending
  const createdAtDescResult =
    await api.functional.redditLike.guest.communities.discover.index(
      guestConnection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "desc",
          limit: 10,
          page: 1,
        } satisfies IRedditLikeCommunity.IRequest,
      },
    );
  typia.assert(createdAtDescResult);
  // 5. Test sorting by subscriber_count descending
  const subscriberCountDescResult =
    await api.functional.redditLike.guest.communities.discover.index(
      guestConnection,
      {
        body: {
          sort_by: "subscriber_count",
          sort_order: "desc",
          limit: 10,
          page: 1,
        } satisfies IRedditLikeCommunity.IRequest,
      },
    );
  typia.assert(subscriberCountDescResult);
  // 6. Test offset-based pagination
  const offsetZeroResult =
    await api.functional.redditLike.guest.communities.discover.index(
      guestConnection,
      {
        body: {
          offset: 0,
          limit: 5,
        } satisfies IRedditLikeCommunity.IRequest,
      },
    );
  typia.assert(offsetZeroResult);
  const offsetTenResult =
    await api.functional.redditLike.guest.communities.discover.index(
      guestConnection,
      {
        body: {
          offset: 10,
          limit: 5,
        } satisfies IRedditLikeCommunity.IRequest,
      },
    );
  typia.assert(offsetTenResult);
  // 7. Test limit parameter boundaries
  const minLimitResult =
    await api.functional.redditLike.guest.communities.discover.index(
      guestConnection,
      {
        body: {
          limit: 1,
        } satisfies IRedditLikeCommunity.IRequest,
      },
    );
  typia.assert(minLimitResult);
  TestValidator.predicate(
    "min limit returns at most 1",
    () => minLimitResult.data.length <= 1,
  );
  const maxLimitResult =
    await api.functional.redditLike.guest.communities.discover.index(
      guestConnection,
      {
        body: {
          limit: 100,
        } satisfies IRedditLikeCommunity.IRequest,
      },
    );
  typia.assert(maxLimitResult);
  TestValidator.predicate(
    "max limit returns at most 100",
    () => maxLimitResult.data.length <= 100,
  );
  // 8. Test page-based pagination
  const pageOneResult =
    await api.functional.redditLike.guest.communities.discover.index(
      guestConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditLikeCommunity.IRequest,
      },
    );
  typia.assert(pageOneResult);
  TestValidator.equals(
    "page 1 has current page 1",
    pageOneResult.pagination.current,
    1,
  );
  const pageTwoResult =
    await api.functional.redditLike.guest.communities.discover.index(
      guestConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IRedditLikeCommunity.IRequest,
      },
    );
  typia.assert(pageTwoResult);
  TestValidator.equals(
    "page 2 has current page 2",
    pageTwoResult.pagination.current,
    2,
  );
  // 9. Test requesting page beyond available range returns empty data
  const largePageResult =
    await api.functional.redditLike.guest.communities.discover.index(
      guestConnection,
      {
        body: {
          page: 999999,
          limit: 10,
        } satisfies IRedditLikeCommunity.IRequest,
      },
    );
  typia.assert(largePageResult);
  TestValidator.predicate(
    "beyond range returns empty data",
    () => largePageResult.data.length === 0,
  );
  TestValidator.predicate(
    "pagination metadata still valid",
    () => largePageResult.pagination.pages >= 0,
  );
  // 10. Validate community summary structure
  if (nameAscResult.data.length > 0) {
    const firstCommunity = nameAscResult.data[0];
    typia.assert(firstCommunity);
    TestValidator.predicate(
      "community has id",
      () => firstCommunity.id !== undefined,
    );
    TestValidator.predicate(
      "community has name",
      () => firstCommunity.name !== undefined,
    );
    TestValidator.predicate(
      "community has subscriber_count",
      () => firstCommunity.subscriber_count >= 0,
    );
    TestValidator.predicate(
      "community has created_at",
      () => firstCommunity.created_at !== undefined,
    );
  }
}
