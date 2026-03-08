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

export async function test_api_posts_home_feed_new_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create primary member account for testing home feed
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create first subscribed community
  const community1 =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community1);
  // 3. Create second subscribed community
  const community2 =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community2);
  // 4. Create another member and non-subscribed community for negative test
  const anotherMemberConnection: api.IConnection = { host: connection.host };
  const anotherMemberAuth = await authorize_member_join(
    anotherMemberConnection,
    {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        displayName: RandomGenerator.name(),
      },
    },
  );
  typia.assert(anotherMemberAuth);
  const nonSubscribedCommunity =
    await generate_random_community_platform_member_communities_create(
      anotherMemberConnection,
      {},
    );
  typia.assert(nonSubscribedCommunity);
  // 5. Subscribe primary member to community1 and community2
  const subscription1 =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: { community_id: community1.id },
      },
    );
  typia.assert(subscription1);
  const subscription2 =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: { community_id: community2.id },
      },
    );
  typia.assert(subscription2);
  // 6. Subscribe another member to non-subscribed community (so they can post)
  const nonSubSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      anotherMemberConnection,
      {
        body: { community_id: nonSubscribedCommunity.id },
      },
    );
  typia.assert(nonSubSubscription);
  // 7. Create posts in subscribed communities with timing intervals
  // First post (older)
  const post1 = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community1.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        contentType: "text",
        textContent: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(post1);
  // Wait to ensure different creation times
  await new Promise((resolve) => setTimeout(resolve, 50));
  // Second post (newer)
  const post2 = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community2.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        contentType: "text",
        textContent: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(post2);
  // Wait to ensure different creation times
  await new Promise((resolve) => setTimeout(resolve, 50));
  // Third post (newest)
  const post3 = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community1.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        contentType: "text",
        textContent: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(post3);
  // 8. Create post in non-subscribed community
  const nonSubscribedPost =
    await generate_random_community_platform_member_posts_create(
      anotherMemberConnection,
      {
        body: {
          communityId: nonSubscribedCommunity.id,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          contentType: "text",
          textContent: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(nonSubscribedPost);
  // 9. Call home feed with 'new' sorting
  const feed = await api.functional.communityPlatform.posts.index(
    memberConnection,
    {
      body: {
        sort: "new",
        limit: 20,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(feed);
  // 10. Verify posts only from subscribed communities
  const subscribedCommunityIds = [community1.id, community2.id];
  for (const post of feed.data) {
    TestValidator.predicate(
      `post ${post.id} is from subscribed community`,
      subscribedCommunityIds.includes(post.community.id),
    );
  }
  // 11. Verify posts are ordered by createdAt DESC (newest first)
  for (let i = 0; i < feed.data.length - 1; i++) {
    const currentCreatedAt = new Date(feed.data[i].createdAt);
    const nextCreatedAt = new Date(feed.data[i + 1].createdAt);
    TestValidator.predicate(
      `posts at index ${i} and ${i + 1} are ordered by createdAt DESC`,
      currentCreatedAt >= nextCreatedAt,
    );
  }
  // 12. Verify non-subscribed community post is NOT in feed
  const nonSubscribedPostInFeed = feed.data.find(
    (post) => post.id === nonSubscribedPost.id,
  );
  TestValidator.equals(
    "non-subscribed post should not be in feed",
    nonSubscribedPostInFeed,
    undefined,
  );
  // 13. Verify our created posts are in the feed
  const post1InFeed = feed.data.find((post) => post.id === post1.id);
  const post2InFeed = feed.data.find((post) => post.id === post2.id);
  const post3InFeed = feed.data.find((post) => post.id === post3.id);
  TestValidator.predicate("post1 should be in feed", post1InFeed !== undefined);
  TestValidator.predicate("post2 should be in feed", post2InFeed !== undefined);
  TestValidator.predicate("post3 should be in feed", post3InFeed !== undefined);
  // 14. Verify post3 (newest) appears before post1 (oldest)
  if (post1InFeed !== undefined && post3InFeed !== undefined) {
    const post1Index = feed.data.findIndex((post) => post.id === post1.id);
    const post3Index = feed.data.findIndex((post) => post.id === post3.id);
    TestValidator.predicate(
      "post3 (newest) should appear before post1 (oldest)",
      post3Index < post1Index,
    );
  }
  // 15. Verify pagination metadata
  TestValidator.predicate(
    "pagination current page should be at least 1",
    feed.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be 20",
    feed.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination records should be at least 3",
    feed.pagination.records >= 3,
  );
}
