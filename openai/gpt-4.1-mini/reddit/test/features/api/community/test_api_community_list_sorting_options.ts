import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_community_list_sorting_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a guest connection and authenticate via guest join
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, { body: {} });
  // Update guest connection headers with the obtained access token
  guestConnection.headers = { Authorization: authorized.token.access };
  // Define sorting options to test
  const sortingOptions: Array<"new" | "old" | "popular"> = [
    "new",
    "old",
    "popular",
  ];
  // For each sorting option, request a paginated community list with fixed limit
  for (const sort of sortingOptions) {
    const requestBody = {
      sort: sort,
      limit: 20,
      page: 1,
    } satisfies ICommunityPlatformCommunity.IRequest;
    const response =
      await api.functional.communityPlatform.guest.communities.index(
        guestConnection,
        { body: requestBody },
      );
    typia.assert(response);
    // Validate pagination metadata correctness
    TestValidator.predicate(
      `pagination current page is positive for sort=${sort}`,
      response.pagination.current >= 1,
    );
    TestValidator.predicate(
      `pagination limit positive for sort=${sort}`,
      response.pagination.limit >= 1 && response.pagination.limit <= 100,
    );
    TestValidator.predicate(
      `pagination page count valid for sort=${sort}`,
      response.pagination.pages >= 0 &&
        response.pagination.pages >=
          Math.ceil(response.pagination.records / response.pagination.limit),
    );
    TestValidator.predicate(
      `pagination records non-negative for sort=${sort}`,
      response.pagination.records >= 0,
    );
    // Validate total pages calculation consistency
    TestValidator.equals(
      `pages count correct for sort=${sort}`,
      response.pagination.pages,
      Math.ceil(response.pagination.records / response.pagination.limit),
    );
    // Validate ordering depending on sort type
    if (response.data.length > 1) {
      if (sort === "new") {
        // Communities should be sorted in descending order of createdAt
        for (let i = 1; i < response.data.length; i++) {
          TestValidator.predicate(
            `new sort ordering: createdAt[${i - 1}] >= createdAt[${i}]`,
            new Date(response.data[i - 1].createdAt) >=
              new Date(response.data[i].createdAt),
          );
        }
      } else if (sort === "old") {
        // Communities should be sorted in ascending order of createdAt
        for (let i = 1; i < response.data.length; i++) {
          TestValidator.predicate(
            `old sort ordering: createdAt[${i - 1}] <= createdAt[${i}]`,
            new Date(response.data[i - 1].createdAt) <=
              new Date(response.data[i].createdAt),
          );
        }
      } else if (sort === "popular") {
        // Communities should be sorted in descending order of subscriberCount
        for (let i = 1; i < response.data.length; i++) {
          TestValidator.predicate(
            `popular sort ordering: subscriberCount[${i - 1}] >= subscriberCount[${i}]`,
            response.data[i - 1].subscriberCount >=
              response.data[i].subscriberCount,
          );
        }
      }
    }
  }
}
