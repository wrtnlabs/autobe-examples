import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_subscriptions_create } from "../../../generate/generate_random_community_platform_community_subscriptions_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_community_subscription_unsubscribe_owner_success(
  connection: api.IConnection,
): Promise<void> {
  // <SCENARIO DESCRIPTION HERE>
  // Unsubscribe as the subscription owner from a specific communitySubscriptionId.
  // Verify:
  // 1) Subsequent posting in that same community is blocked.
  // 2) Historical posts authored before unsubscribe remain visible via normal browsing behavior.
  // 3) Unsubscribe does not affect other subscriptions for the same member in other communities.
  // 1) Member actor join
  const memberConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformMember.IJoin;
  const memberAuth = await authorize_member_join(memberConnection, {
    body: credentials,
  });
  typia.assert(memberAuth);
  // Actor-specific connection for subsequent calls
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers ??= {};
  userConnection.headers.Authorization = memberAuth.token.access;
  // 2) Create primary community
  const community1 =
    await generate_random_community_platform_communities_create(
      userConnection,
      {
        body: {
          name: `${RandomGenerator.alphabets(8)}-${RandomGenerator.alphabets(4)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_href: `https://example.com/${RandomGenerator.alphabets(10)}`,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community1);
  // 3) Subscribe to community1
  const subscription1 =
    await generate_random_community_platform_community_subscriptions_create(
      userConnection,
      {
        body: { community_id: community1.id },
      },
    );
  typia.assert(subscription1);
  // Secondary community+subscription to validate isolation
  const community2 =
    await generate_random_community_platform_communities_create(
      userConnection,
      {
        body: {
          name: `${RandomGenerator.alphabets(8)}-${RandomGenerator.alphabets(5)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_href: `https://example.com/${RandomGenerator.alphabets(10)}`,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);
  const subscription2 =
    await generate_random_community_platform_community_subscriptions_create(
      userConnection,
      {
        body: { community_id: community2.id },
      },
    );
  typia.assert(subscription2);
  // 4) Create a post in community1 before unsubscribe
  const preUnsubPostTitle = `pre-unsub-marker-${RandomGenerator.alphabets(10)}`;
  await generate_random_community_platform_member_posts_create(userConnection, {
    body: {
      community_id: community1.id,
      post_type: typia.random<string>(),
      title: preUnsubPostTitle,
      body_text: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies ICommunityPlatformPost.ICreate,
  });
  // 5) Unsubscribe
  await api.functional.communityPlatform.communitySubscriptions.erase(
    userConnection,
    {
      communitySubscriptionId: subscription1.id,
    },
  );
  // 6) Posting in community1 should be blocked
  await TestValidator.error(
    "cannot create post after unsubscribe from community1",
    async () => {
      await generate_random_community_platform_member_posts_create(
        userConnection,
        {
          body: {
            community_id: community1.id,
            post_type: typia.random<string>(),
            title: `post-after-unsub-${RandomGenerator.alphabets(8)}`,
            body_text: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies ICommunityPlatformPost.ICreate,
        },
      );
    },
  );
  // 7) Secondary subscription should still allow posting
  await generate_random_community_platform_member_posts_create(userConnection, {
    body: {
      community_id: community2.id,
      post_type: typia.random<string>(),
      title: `post-in-community2-${RandomGenerator.alphabets(8)}`,
      body_text: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies ICommunityPlatformPost.ICreate,
  });
  // 8) Historical visibility
  // No member post list/detail SDK function was provided in the available API set,
  // so history visibility cannot be validated here without an explicit endpoint.
  // (Intentionally left unimplemented.)
  typia.assert(subscription1);
  typia.assert(subscription2);
}
