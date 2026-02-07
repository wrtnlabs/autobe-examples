import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
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

export async function test_api_member_home_feed_top_all_time(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup actor connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {} satisfies ICommunityPlatformMember.IJoin,
  });
  // 2. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      { body: {} satisfies ICommunityPlatformCommunity.ICreate },
    );
  typia.assert(community);
  // 3. Subscribe to community
  await api.functional.communityPlatform.member.communities.subscriptions.create(
    memberConnection,
    {
      communityId: community.id satisfies string & tags.Format<"uuid">,
    },
  );
  // 4. Get home feed
  const homeFeed =
    await api.functional.communityPlatform.member.feed.home.index(
      memberConnection,
    );
  typia.assert(homeFeed);
  // 5. Validate sort order
  const expectedSortedPosts = [...homeFeed.data].sort(
    (a, b) => b.votes - a.votes,
  );
  TestValidator.index(
    "home feed correctly sorted by 'Top' (all time) descending",
    expectedSortedPosts,
    homeFeed.data,
    true,
  );
}
