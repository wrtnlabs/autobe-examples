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

export async function test_api_community_list_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest join to authenticate
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {});
  guestConnection.headers = { Authorization: guest.token.access };
  // 2. Retrieve a full list of communities (page 1, limit 50, no filter) to find base for filtering
  const fullList =
    await api.functional.communityPlatform.guest.communities.index(
      guestConnection,
      {
        body: { page: 1, limit: 50 },
      },
    );
  typia.assert(fullList);
  // 3. If no communities, test with empty result
  if (fullList.data.length === 0) {
    // Query with name filter that surely returns empty
    const emptyFilter =
      await api.functional.communityPlatform.guest.communities.index(
        guestConnection,
        {
          body: { name: "zzzzzzzzzzzz", page: 1, limit: 10 },
        },
      );
    typia.assert(emptyFilter);
    TestValidator.equals(
      "empty filtered data length",
      emptyFilter.data.length,
      0,
    );
    TestValidator.equals(
      "empty filtered records",
      emptyFilter.pagination.records,
      0,
    );
    return;
  }
  // 4. Pick a community from existing list to extract partial name for search
  const sampleCommunity = fullList.data[0];
  typia.assert(sampleCommunity);
  // Extract a substring (at least 1 character, up to half name length)
  const name = sampleCommunity.name;
  const startIdx = 0;
  const length = Math.max(1, Math.floor(name.length / 2));
  const partialName = name.substring(startIdx, startIdx + length);
  // 5. Search with partial name
  const searchResponse =
    await api.functional.communityPlatform.guest.communities.index(
      guestConnection,
      {
        body: {
          name: partialName,
          page: 1,
          limit: 20,
          sort: "new",
        },
      },
    );
  typia.assert(searchResponse);
  // 6. Validate pagination fields
  TestValidator.predicate(
    "pagination current page valid",
    searchResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    searchResponse.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination pages valid",
    searchResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records valid",
    searchResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination records reflect data length",
    searchResponse.pagination.records >= searchResponse.data.length,
  );
  // 7. Validate each community name contains the partial name (case-insensitive)
  for (const community of searchResponse.data) {
    typia.assert(community);
    const lowerName = community.name.toLowerCase();
    const lowerPartial = partialName.toLowerCase();
    TestValidator.predicate(
      `community name contains partial '${partialName}' (name: ${community.name})`,
      lowerName.includes(lowerPartial),
    );
  }
}
