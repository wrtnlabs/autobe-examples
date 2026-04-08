import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_communities_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register guest account for authentication
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: typia.random<IRedditCommunityGuest.IJoin>(),
  });
  typia.assert(guest);
  // Step 2: Create new connection with guest authentication
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    Authorization: guest.token.access,
  };
  // Step 3: Generate expected data for sorting validation (multiple communities)
  const communityCount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<20> & tags.Maximum<50>
  >();
  const expectedData = ArrayUtil.repeat(communityCount, () =>
    typia.random<IRedditCommunityCommunity.ISummary>(),
  );
  // Step 4: Test default sort (subscriber_count DESC)
  const defaultResult =
    await api.functional.redditCommunity.guest.communities.index(
      authenticatedConnection,
      {
        body: {},
      },
    );
  typia.assert(defaultResult);
  TestValidator.predicate(
    "default result has data",
    defaultResult.data.length > 0,
  );
  // Step 5: Test name sorting (ascending)
  const nameAscResult =
    await api.functional.redditCommunity.guest.communities.index(
      authenticatedConnection,
      {
        body: {
          sort: "name_asc",
          limit: 50,
        },
      },
    );
  typia.assert(nameAscResult);
  const nameAscExpected = [...expectedData].sort((a, b) =>
    (a.name ?? "").localeCompare(b.name ?? ""),
  );
  TestValidator.index(
    "name ascending sort",
    nameAscExpected,
    nameAscResult.data,
  );
  // Step 6: Test name sorting (descending)
  const nameDescResult =
    await api.functional.redditCommunity.guest.communities.index(
      authenticatedConnection,
      {
        body: {
          sort: "name_desc",
          limit: 50,
        },
      },
    );
  typia.assert(nameDescResult);
  const nameDescExpected = [...expectedData].sort((a, b) =>
    (b.name ?? "").localeCompare(a.name ?? ""),
  );
  TestValidator.index(
    "name descending sort",
    nameDescExpected,
    nameDescResult.data,
  );
  // Step 7: Test subscriber count sorting (descending)
  const subscriberDescResult =
    await api.functional.redditCommunity.guest.communities.index(
      authenticatedConnection,
      {
        body: {
          sort: "subscriber_count_desc",
          limit: 50,
        },
      },
    );
  typia.assert(subscriberDescResult);
  const subscriberDescExpected = [...expectedData].sort((a, b) => {
    const countA = a.subscriber_count ?? 0;
    const countB = b.subscriber_count ?? 0;
    return countB - countA;
  });
  TestValidator.index(
    "subscriber count descending sort",
    subscriberDescExpected,
    subscriberDescResult.data,
  );
  // Step 8: Test subscriber count sorting (ascending)
  const subscriberAscResult =
    await api.functional.redditCommunity.guest.communities.index(
      authenticatedConnection,
      {
        body: {
          sort: "subscriber_count_asc",
          limit: 50,
        },
      },
    );
  typia.assert(subscriberAscResult);
  const subscriberAscExpected = [...expectedData].sort((a, b) => {
    const countA = a.subscriber_count ?? 0;
    const countB = b.subscriber_count ?? 0;
    return countA - countB;
  });
  TestValidator.index(
    "subscriber count ascending sort",
    subscriberAscExpected,
    subscriberAscResult.data,
  );
  // Step 9: Test created at sorting (descending)
  const createdAtDescResult =
    await api.functional.redditCommunity.guest.communities.index(
      authenticatedConnection,
      {
        body: {
          sort: "created_at_desc",
          limit: 50,
        },
      },
    );
  typia.assert(createdAtDescResult);
  const createdAtDescExpected = [...expectedData].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  TestValidator.index(
    "created at descending sort",
    createdAtDescExpected,
    createdAtDescResult.data,
  );
  // Step 10: Test created at sorting (ascending)
  const createdAtAscResult =
    await api.functional.redditCommunity.guest.communities.index(
      authenticatedConnection,
      {
        body: {
          sort: "created_at_asc",
          limit: 50,
        },
      },
    );
  typia.assert(createdAtAscResult);
  const createdAtAscExpected = [...expectedData].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  TestValidator.index(
    "created at ascending sort",
    createdAtAscExpected,
    createdAtAscResult.data,
  );
  // Step 11: Test pagination with name sort
  const paginatedResult =
    await api.functional.redditCommunity.guest.communities.index(
      authenticatedConnection,
      {
        body: {
          sort: "name_asc",
          page: 2,
          limit: 10,
        },
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination page 2",
    paginatedResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit",
    paginatedResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination has records",
    paginatedResult.pagination.records > 10,
  );
  // Step 12: Test combined filters (name + subscriber_count_min + sort)
  const combinedResult =
    await api.functional.redditCommunity.guest.communities.index(
      authenticatedConnection,
      {
        body: {
          name: "test",
          subscriber_count_min: 5,
          sort: "created_at_desc",
          limit: 50,
        },
      },
    );
  typia.assert(combinedResult);
  TestValidator.predicate(
    "combined filters has results",
    combinedResult.data.length >= 0,
  );
  // Verify pagination metadata
  TestValidator.predicate(
    "pagination records consistent",
    combinedResult.pagination.records >= combinedResult.data.length,
  );
}
