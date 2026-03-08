import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_sorting_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create multiple communities with varying data
  const communities = await ArrayUtil.asyncRepeat(5, async (index) => {
    await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay to ensure different creation times
    return generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: `community_${String.fromCharCode(97 + index)}_${RandomGenerator.alphaNumeric(4)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  });
  // 3. Test sort='new' - should be ordered by created_at descending (newest first)
  const newSorted = await api.functional.communityPlatform.communities.index(
    connection,
    {
      body: { sort: "new" } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(newSorted);
  // Verify new sorting - newest first
  const newSortedWithDates = newSorted.data
    .map((item) => {
      const community = communities.find((c) => c.id === item.id);
      return { ...item, createdAt: community?.createdAt };
    })
    .filter((item) => item.createdAt);
  for (let i = 0; i < newSortedWithDates.length - 1; i++) {
    TestValidator.predicate(
      "new sort - newer before older",
      new Date(newSortedWithDates[i].createdAt!) >=
        new Date(newSortedWithDates[i + 1].createdAt!),
    );
  }
  // 4. Test sort='popular' - should be ordered by subscriber_count descending
  const popularSorted =
    await api.functional.communityPlatform.communities.index(connection, {
      body: { sort: "popular" } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(popularSorted);
  // Verify popular sorting - highest subscriber count first
  for (let i = 0; i < popularSorted.data.length - 1; i++) {
    TestValidator.predicate(
      "popular sort - higher count first",
      popularSorted.data[i].subscriber_count >=
        popularSorted.data[i + 1].subscriber_count,
    );
  }
  // 5. Test sort='name' - should be ordered alphabetically by name ascending
  const nameSorted = await api.functional.communityPlatform.communities.index(
    connection,
    {
      body: { sort: "name" } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(nameSorted);
  // Verify name sorting - alphabetical order
  for (let i = 0; i < nameSorted.data.length - 1; i++) {
    TestValidator.predicate(
      "name sort - alphabetical order",
      nameSorted.data[i].name.localeCompare(nameSorted.data[i + 1].name) <= 0,
    );
  }
  // 6. Verify default sorting (no sort parameter) - should use creation date descending
  const defaultSorted =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {} satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(defaultSorted);
  // Verify default is same as 'new' sort
  const defaultSortedWithDates = defaultSorted.data
    .map((item) => {
      const community = communities.find((c) => c.id === item.id);
      return { ...item, createdAt: community?.createdAt };
    })
    .filter((item) => item.createdAt);
  for (let i = 0; i < defaultSortedWithDates.length - 1; i++) {
    TestValidator.predicate(
      "default sort - newest first",
      new Date(defaultSortedWithDates[i].createdAt!) >=
        new Date(defaultSortedWithDates[i + 1].createdAt!),
    );
  }
  // 7. Test sorting with search filtering
  const searchName = communities[0].name.substring(0, 10);
  const searchResults =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        search: searchName,
        sort: "name",
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(searchResults);
  // Verify search results contain the search term
  TestValidator.predicate(
    "search results contain search term",
    searchResults.data.some((c) => c.name.includes(searchName)),
  );
  // Verify search results are still sorted by name
  for (let i = 0; i < searchResults.data.length - 1; i++) {
    TestValidator.predicate(
      "search with sort - alphabetical",
      searchResults.data[i].name.localeCompare(
        searchResults.data[i + 1].name,
      ) <= 0,
    );
  }
  // 8. Verify pagination metadata
  const paginatedResult =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        sort: "new",
        page: 1,
        limit: 2,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination current page",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", paginatedResult.pagination.limit, 2);
  TestValidator.predicate(
    "pagination records positive",
    paginatedResult.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages positive",
    paginatedResult.pagination.pages > 0,
  );
}
