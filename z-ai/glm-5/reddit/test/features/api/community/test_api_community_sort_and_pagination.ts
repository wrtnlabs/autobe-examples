import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
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

export async function test_api_community_sort_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create multiple communities with delay for distinct timestamps
  const communities: ICommunityPlatformCommunity[] = [];
  for (let i = 0; i < 3; i++) {
    const community =
      await generate_random_community_platform_member_communities_create(
        memberConnection,
        {
          body: {
            name: `test_community_${Date.now()}_${i}`,
            description: `Test community ${i} for sorting and pagination testing`,
          },
        },
      );
    communities.push(community);
    // Wait briefly between creations to ensure distinct created_at timestamps
    if (i < 2) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  // 3. Test sorting by popular (subscriber_count DESC)
  const popularResult =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        sort: "popular",
        limit: 10,
        page: 1,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(popularResult);
  // Verify popular sorting - subscriber_count should be descending
  for (let i = 0; i < popularResult.data.length - 1; i++) {
    TestValidator.predicate(
      "popular sort - subscriber_count descending",
      popularResult.data[i].subscriber_count >=
        popularResult.data[i + 1].subscriber_count,
    );
  }
  // 4. Test sorting by newest (created_at DESC)
  const newestResult = await api.functional.communityPlatform.communities.index(
    connection,
    {
      body: {
        sort: "newest",
        limit: 10,
        page: 1,
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(newestResult);
  // Verify newest sorting - created_at should be descending (most recent first)
  for (let i = 0; i < newestResult.data.length - 1; i++) {
    const currentDate = new Date(newestResult.data[i].created_at).getTime();
    const nextDate = new Date(newestResult.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      "newest sort - created_at descending",
      currentDate >= nextDate,
    );
  }
  // 5. Test pagination - limit and page
  const page1 = await api.functional.communityPlatform.communities.index(
    connection,
    {
      body: {
        limit: 2,
        page: 1,
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.predicate("page 1 has max 2 items", page1.data.length <= 2);
  const page2 = await api.functional.communityPlatform.communities.index(
    connection,
    {
      body: {
        limit: 2,
        page: 2,
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.predicate("page 2 has max 2 items", page2.data.length <= 2);
  // Verify pagination metadata consistency
  TestValidator.equals(
    "total records match across pages",
    page1.pagination.records,
    page2.pagination.records,
  );
  TestValidator.equals(
    "total pages match across pages",
    page1.pagination.pages,
    page2.pagination.pages,
  );
  // 6. Test empty search results
  const emptySearch = await api.functional.communityPlatform.communities.index(
    connection,
    {
      body: {
        search: `nonexistent_unique_search_term_xyz123_${Date.now()}`,
        limit: 10,
        page: 1,
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty data array for no matches",
    emptySearch.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for no matches",
    emptySearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for no matches",
    emptySearch.pagination.pages,
    0,
  );
}
