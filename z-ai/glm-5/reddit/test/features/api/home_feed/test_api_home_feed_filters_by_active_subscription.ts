import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
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
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

/**
 * Test that the home feed correctly filters posts based on active subscriptions.
 *
 * Verifies:
 * - Only posts from actively subscribed communities appear in the home feed
 * - Subscription state changes immediately affect feed content
 * - Inactive subscriptions (is_active = false) exclude posts from that community
 */
export async function test_api_home_feed_filters_by_active_subscription(
  connection: api.IConnection,
): Promise<void> {
  // Create viewer member (will test feed filtering)
  const viewerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(viewerConnection, {});
  // Create author member (will create communities and posts)
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authorConnection, {});
  // Create two communities
  const community1 =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community1);
  const community2 =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community2);
  // Create posts in community1
  await generate_random_community_platform_member_posts_create(
    authorConnection,
    {
      body: {
        communityId: community1.id,
        title: RandomGenerator.name(),
        contentType: "text",
        textContent: RandomGenerator.paragraph({ sentences: 3 }),
        linkUrl: null,
        imageUrl: null,
      },
    },
  );
  await generate_random_community_platform_member_posts_create(
    authorConnection,
    {
      body: {
        communityId: community1.id,
        title: RandomGenerator.name(),
        contentType: "text",
        textContent: RandomGenerator.paragraph({ sentences: 3 }),
        linkUrl: null,
        imageUrl: null,
      },
    },
  );
  // Create posts in community2
  await generate_random_community_platform_member_posts_create(
    authorConnection,
    {
      body: {
        communityId: community2.id,
        title: RandomGenerator.name(),
        contentType: "text",
        textContent: RandomGenerator.paragraph({ sentences: 3 }),
        linkUrl: null,
        imageUrl: null,
      },
    },
  );
  await generate_random_community_platform_member_posts_create(
    authorConnection,
    {
      body: {
        communityId: community2.id,
        title: RandomGenerator.name(),
        contentType: "text",
        textContent: RandomGenerator.paragraph({ sentences: 3 }),
        linkUrl: null,
        imageUrl: null,
      },
    },
  );
  // TEST 1: Viewer subscribes to community1 only
  const subscription1 =
    await generate_random_community_platform_member_subscriptions_create(
      viewerConnection,
      {
        body: {
          community_id: community1.id,
        },
      },
    );
  typia.assert(subscription1);
  TestValidator.equals(
    "subscription1 is active",
    subscription1.is_active,
    true,
  );
  // Get home feed - should only show community1 posts
  const feed1 = await api.functional.communityPlatform.member.home._feed.index(
    viewerConnection,
    {
      body: {
        limit: 100,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(feed1);
  // Verify only community1 posts appear
  const feed1CommunityIds = feed1.data.map((post) => post.community.id);
  TestValidator.predicate(
    "feed1 contains community1 posts",
    feed1CommunityIds.includes(community1.id),
  );
  TestValidator.predicate(
    "feed1 does not contain community2 posts",
    !feed1CommunityIds.includes(community2.id),
  );
  TestValidator.equals(
    "feed1 contains expected community1 posts count",
    feed1.data.length,
    2,
  );
  // TEST 2: Viewer subscribes to community2
  const subscription2 =
    await generate_random_community_platform_member_subscriptions_create(
      viewerConnection,
      {
        body: {
          community_id: community2.id,
        },
      },
    );
  typia.assert(subscription2);
  TestValidator.equals(
    "subscription2 is active",
    subscription2.is_active,
    true,
  );
  // Get home feed - should show posts from both communities
  const feed2 = await api.functional.communityPlatform.member.home._feed.index(
    viewerConnection,
    {
      body: {
        limit: 100,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(feed2);
  // Verify posts from both communities appear
  const feed2CommunityIds = feed2.data.map((post) => post.community.id);
  TestValidator.predicate(
    "feed2 contains community1 posts",
    feed2CommunityIds.includes(community1.id),
  );
  TestValidator.predicate(
    "feed2 contains community2 posts",
    feed2CommunityIds.includes(community2.id),
  );
  TestValidator.equals(
    "feed2 contains all posts from both communities",
    feed2.data.length,
    4,
  );
  // TEST 3: Subscription deactivation scenario
  // Note: The API does not currently expose an endpoint to deactivate subscriptions
  // (no PATCH or DELETE endpoint for subscriptions in the provided API list).
  // When such an endpoint becomes available, this test should be extended to:
  // 1. Deactivate subscription to community1
  // 2. Verify home feed shows only community2 posts
}
