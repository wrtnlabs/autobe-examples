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

class FakeClass {} // Not actually needed, but a placeholder to avoid compile errors

export async function test_api_member_home_feed_hot_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and login
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: typia.random<ICommunityPlatformMember.IJoin>(),
  });
  // 2. Create community to subscribe to
  const community =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      {
        body: typia.random<ICommunityPlatformCommunity.ICreate>(),
      },
    );
  typia.assert(community);
  // 3. Subscribe to created community
  const subscription =
    await api.functional.communityPlatform.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 4. Retrieve home feed
  const homeFeed =
    await api.functional.communityPlatform.member.feed.home.index(
      memberConnection,
    );
  typia.assert(homeFeed);
  // 5. Validate feed sorting - Hot algorithm (upvotes + post age × 0.5) descending
  TestValidator.predicate("Home feed sorted by Hot algorithm", () => {
    const posts = homeFeed.data;
    return posts.every((_, i, arr) => {
      if (i === 0) return true;
      const prev = arr[i - 1];
      const current = arr[i];
      const prevScore =
        prev.votes +
        ((new Date().getTime() - new Date(prev.created_at).getTime()) /
          3600000) *
          0.5;
      const currentScore =
        current.votes +
        ((new Date().getTime() - new Date(current.created_at).getTime()) /
          3600000) *
          0.5;
      return prevScore >= currentScore;
    });
  });
  // 6. Validate feed content structure
  TestValidator.equals(
    "Community names present",
    homeFeed.data.every((post) => post.community.name),
    true,
  );
  TestValidator.equals(
    "Author present",
    homeFeed.data.every((post) => post.author),
    true,
  );
  TestValidator.equals(
    "Content previews present",
    homeFeed.data.every((post) => post.title.length > 0),
    true,
  );
}
