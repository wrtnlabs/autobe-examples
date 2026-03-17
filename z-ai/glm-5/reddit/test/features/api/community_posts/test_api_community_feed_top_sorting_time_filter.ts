import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
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

export async function test_api_community_feed_top_sorting_time_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Test Top sorting with time_range='today'
  const todayFeed =
    await api.functional.communityPlatform.communities.posts.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          sort: "top",
          time_range: "today",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(todayFeed);
  TestValidator.equals(
    "today feed has pagination",
    todayFeed.pagination.current,
    1,
  );
  TestValidator.predicate(
    "today feed pagination valid",
    todayFeed.pagination.limit === 10,
  );
  // 4. Test Top sorting with time_range='week'
  const weekFeed =
    await api.functional.communityPlatform.communities.posts.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          sort: "top",
          time_range: "week",
          page: 1,
          limit: 25,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(weekFeed);
  TestValidator.equals(
    "week feed has pagination",
    weekFeed.pagination.current,
    1,
  );
  // 5. Test Top sorting with time_range='month'
  const monthFeed =
    await api.functional.communityPlatform.communities.posts.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          sort: "top",
          time_range: "month",
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(monthFeed);
  TestValidator.equals(
    "month feed has pagination",
    monthFeed.pagination.current,
    1,
  );
  // 6. Test Top sorting with time_range='year'
  const yearFeed =
    await api.functional.communityPlatform.communities.posts.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          sort: "top",
          time_range: "year",
          page: 1,
          limit: 25,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(yearFeed);
  TestValidator.equals(
    "year feed has pagination",
    yearFeed.pagination.current,
    1,
  );
  // 7. Test Top sorting with time_range='all'
  const allFeed =
    await api.functional.communityPlatform.communities.posts.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          sort: "top",
          time_range: "all",
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(allFeed);
  TestValidator.equals(
    "all feed has pagination",
    allFeed.pagination.current,
    1,
  );
  TestValidator.predicate(
    "all feed limit is 100",
    allFeed.pagination.limit === 100,
  );
  // 8. Verify default behavior (no sort specified should use hot)
  const defaultFeed =
    await api.functional.communityPlatform.communities.posts.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 25,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(defaultFeed);
  TestValidator.equals(
    "default feed has pagination",
    defaultFeed.pagination.current,
    1,
  );
  // 9. Test with null time_range (should be treated as default 'all')
  const nullTimeRangeFeed =
    await api.functional.communityPlatform.communities.posts.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          sort: "top",
          time_range: null,
          page: 1,
          limit: 25,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(nullTimeRangeFeed);
  TestValidator.equals(
    "null time_range feed has pagination",
    nullTimeRangeFeed.pagination.current,
    1,
  );
}
