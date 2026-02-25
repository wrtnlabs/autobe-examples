import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

export async function test_api_feed_home_respects_subscription_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authorize member with new credentials
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // Set Authorization header using the token from authorization
  memberConnection.headers = { Authorization: member.token.access };
  // 2. Create Community A (subscribed to)
  const communityA =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(communityA);
  // 3. Create Community B (unsubscribed from)
  const communityB =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(communityB);
  // 4. Subscribe to Community A
  const subscriptionA =
    await api.functional.redditCommunity.member.communities.subscribe.create(
      memberConnection,
      {
        communityId: communityA.id,
      },
    );
  typia.assert(subscriptionA);
  // 5. Subscribe to Community B
  const subscriptionB =
    await api.functional.redditCommunity.member.communities.subscribe.create(
      memberConnection,
      {
        communityId: communityB.id,
      },
    );
  typia.assert(subscriptionB);
  // 6. Unsubscribe from Community B
  const unsubscribeResult =
    await api.functional.redditCommunity.member.subscriptions.erase(
      memberConnection,
      {
        subscriptionId: subscriptionB.id,
      },
    );
  typia.assert(unsubscribeResult);
  // 7. Call home feed endpoint and validate subscription state respects
  const feed =
    await api.functional.redditCommunity.member.feed.home.index(
      memberConnection,
    );
  typia.assert(feed);
  // Verify that all returned posts are from Community A and none from Community B
  for (const post of feed.data) {
    TestValidator.equals(
      "post community matches subscribed community",
      post.community.id,
      communityA.id,
    );
    TestValidator.notEquals(
      "post community is not unsubscribed community",
      post.community.id,
      communityB.id,
    );
  }
  // Verify that there is at least one post from Community A
  TestValidator.predicate(
    "has at least one post from Community A",
    feed.data.length > 0,
  );
  // Verify that there are no posts from Community B
  const communityBPosts = feed.data.filter(
    (post) => post.community.id === communityB.id,
  );
  TestValidator.equals(
    "no posts from unsubscribed community",
    communityBPosts.length,
    0,
  );
}
