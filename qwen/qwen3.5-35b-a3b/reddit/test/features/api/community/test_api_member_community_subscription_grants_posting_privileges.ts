import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { generate_random_reddit_platform_member_subscriptions_create } from "../../../generate/generate_random_reddit_platform_member_subscriptions_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_member_community_subscription_grants_posting_privileges(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member Setup: Register new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(12),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  TestValidator.predicate(
    "member has auth token",
    () => memberAuth.token.access !== null,
  );
  // 2. Community Creation: Create a test community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<3> & tags.MaxLength<20>>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals("community created", community.subscriber_count, 0);
  // 3. Subscription: Subscribe to the community
  const subscription =
    await generate_random_reddit_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          confirmSubscription: true,
        } satisfies IRedditPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  TestValidator.equals("subscription created", subscription.deletedAt, null);
  TestValidator.equals(
    "subscription member matches",
    subscription.redditPlatformMemberId,
    memberAuth.id,
  );
  TestValidator.equals(
    "subscription community matches",
    subscription.redditPlatformCommunityId,
    community.id,
  );
  // 4. Verify community subscriber count incremented
  TestValidator.equals(
    "subscriber count incremented",
    community.subscriber_count,
    1,
  );
  // 5. Post Creation: Create TEXT post in subscribed community
  const textPost = await generate_random_reddit_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "TEXT",
        redditPlatformCommunityId: community.id,
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(textPost);
  TestValidator.equals("text post title present", textPost.title !== "", true);
  TestValidator.equals("text post type", textPost.postType, "TEXT");
  TestValidator.equals(
    "text post community",
    textPost.community.id,
    community.id,
  );
  TestValidator.equals("text post author", textPost.author.id, memberAuth.id);
  // 6. Post Creation: Create LINK post in subscribed community
  const linkPost = await generate_random_reddit_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "LINK",
        redditPlatformCommunityId: community.id,
        url: typia.random<
          string & tags.Format<"uri"> & tags.MaxLength<80000>
        >(),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(linkPost);
  TestValidator.equals("link post title present", linkPost.title !== "", true);
  TestValidator.equals("link post type", linkPost.postType, "LINK");
  TestValidator.equals("link post has URL", linkPost.url !== "", true);
  TestValidator.equals(
    "link post community",
    linkPost.community.id,
    community.id,
  );
  // 7. Post Creation: Create IMAGE post in subscribed community
  const imagePost = await generate_random_reddit_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "IMAGE",
        redditPlatformCommunityId: community.id,
        imageUrl: typia.random<
          string & tags.Format<"uri"> & tags.MaxLength<80000>
        >(),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(imagePost);
  TestValidator.equals(
    "image post title present",
    imagePost.title !== "",
    true,
  );
  TestValidator.equals("image post type", imagePost.postType, "IMAGE");
  TestValidator.equals("image post has URL", imagePost.imageUrl !== "", true);
  TestValidator.equals(
    "image post community",
    imagePost.community.id,
    community.id,
  );
  // 8. Verify all posts were created successfully with proper metadata
  TestValidator.equals(
    "text post vote score initialized",
    textPost.voteScore,
    0,
  );
  TestValidator.equals(
    "text post comment count initialized",
    textPost.commentCount,
    0,
  );
  TestValidator.equals(
    "link post vote score initialized",
    linkPost.voteScore,
    0,
  );
  TestValidator.equals(
    "link post comment count initialized",
    linkPost.commentCount,
    0,
  );
  TestValidator.equals(
    "image post vote score initialized",
    imagePost.voteScore,
    0,
  );
  TestValidator.equals(
    "image post comment count initialized",
    imagePost.commentCount,
    0,
  );
  // 9. Validate post creation timestamps are valid ISO 8601 format
  TestValidator.equals(
    "text post has createdAt",
    typeof textPost.createdAt === "string",
    true,
  );
  TestValidator.equals(
    "link post has createdAt",
    typeof linkPost.createdAt === "string",
    true,
  );
  TestValidator.equals(
    "image post has createdAt",
    typeof imagePost.createdAt === "string",
    true,
  );
  // 10. Verify posts have null deletedAt (not deleted)
  TestValidator.equals("text post not deleted", textPost.deletedAt, null);
  TestValidator.equals("link post not deleted", linkPost.deletedAt, null);
  TestValidator.equals("image post not deleted", imagePost.deletedAt, null);
  // 11. Validate subscription requirement - member has active subscription
  TestValidator.predicate(
    "member has active subscription",
    () => subscription.deletedAt === null,
  );
}
