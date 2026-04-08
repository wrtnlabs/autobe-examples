import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import type { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import type { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
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
import { generate_random_reddit_community_member_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_member_subscriptions_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test that home feed correctly excludes posts from communities the member is not subscribed to.
 *
 * Validates the complete home feed filtering workflow including member registration, community creation, subscription management, and post visibility. Ensures that the home feed strictly filters content to show only posts from communities the member is subscribed to.
 *
 * The test creates two distinct communities, subscribes the member to only one of them, creates posts in both communities, and verifies that the home feed returns exclusively posts from the subscribed community while completely excluding posts from the unsubscribed community.
 *
 * 1. Member registers with unique credentials.
 * 2. Creates Community A (will subscribe) and Community B (will not subscribe).
 * 3. Subscribes member to Community A only.
 * 4. Creates multiple posts in Community A (subscribed).
 * 5. Creates multiple posts in Community B (not subscribed).
 * 6. Retrieves home feed and validates filtering.
 * 7. Verifies all returned posts belong to Community A.
 * 8. Verifies no posts from Community B appear in feed.
 * 9. Verifies post count matches expected number from Community A.
 */
export async function test_api_home_feed_filters_unsubscribed_communities(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 2. Create two communities
  const communityA =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  const communityB =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  // 3. Subscribe member to Community A only
  await generate_random_reddit_community_member_member_subscriptions_create(
    memberConnection,
    {
      body: {
        community_id: communityA.id,
      } satisfies IRedditCommunitySubscription.ICreate,
    },
  );
  // 4. Create posts in Community A (subscribed) - create 3 posts
  const postsInA = await ArrayUtil.asyncRepeat(3, async () =>
    generate_random_reddit_community_posts_create(memberConnection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        community_id: communityA.id,
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    }),
  );
  // 5. Create posts in Community B (not subscribed) - create 2 posts
  const postsInB = await ArrayUtil.asyncRepeat(2, async () =>
    generate_random_reddit_community_posts_create(memberConnection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        community_id: communityB.id,
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    }),
  );
  // 6. Retrieve home feed
  const feed = await api.functional.redditCommunity.member.feed.home.index(
    memberConnection,
    {
      body: {
        sort: "new",
        take: 100,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(feed);
  // 7. Verify all returned posts belong to Community A
  TestValidator.predicate("all posts from subscribed community", () =>
    feed.data.every((post) => post.community.id === communityA.id),
  );
  // 8. Verify no posts from Community B appear in feed
  const hasPostsFromB = feed.data.some(
    (post) => post.community.id === communityB.id,
  );
  TestValidator.predicate(
    "no posts from unsubscribed community",
    () => !hasPostsFromB,
  );
  // 9. Verify post count matches expected number from Community A
  TestValidator.equals(
    "post count matches subscribed community posts",
    feed.data.length,
    postsInA.length,
  );
  // 10. Verify each post's community name matches Community A
  feed.data.forEach((post) => {
    TestValidator.equals(
      "community name matches",
      post.community.name,
      communityA.name,
    );
  });
}
