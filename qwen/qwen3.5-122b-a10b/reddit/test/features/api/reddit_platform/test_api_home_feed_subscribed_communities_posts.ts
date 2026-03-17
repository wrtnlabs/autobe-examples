import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
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
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_home_feed_subscribed_communities_posts(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
        typia.random<string & tags.Format<"email">>()
      ),
      password: typia.assert<string & tags.MinLength<8> & tags.MaxLength<128>>(
        RandomGenerator.alphaNumeric(16)
      ),
      username: typia.assert<string & tags.MinLength<1> & tags.MaxLength<50>>(
        RandomGenerator.name(1)
      ),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create first community (subscribed)
  const community1 =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community1);
  // 3. Create second community (not subscribed)
  const community2 =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);
  // 4. Subscribe member to first community only
  const subscription =
    await api.functional.redditPlatform.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community1.id,
      },
    );
  typia.assert(subscription);
  // 5. Create post in subscribed community (should appear in feed)
  const post1 = await generate_random_reddit_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community1.id,
        title: RandomGenerator.name(3),
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post1);
  // 6. Create post in non-subscribed community (should NOT appear in feed)
  const post2 = await generate_random_reddit_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community2.id,
        title: RandomGenerator.name(3),
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post2);
  // 7. Access home feed and verify filtering
  const feed = await api.functional.redditPlatform.member.feeds.home.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(feed);
  // 8. Validate pagination metadata
  TestValidator.equals("pagination current page", feed.pagination.current, 1);
  TestValidator.equals("pagination limit", feed.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records exists",
    feed.pagination.records > 0,
  );
  TestValidator.predicate("pagination pages exists", feed.pagination.pages > 0);
  // 9. Verify only subscribed community posts appear
  const postIds = feed.data.map((post) => post.id);
  TestValidator.equals(
    "subscribed community post appears",
    postIds.includes(post1.id),
    true,
  );
  TestValidator.equals(
    "non-subscribed community post excluded",
    postIds.includes(post2.id),
    false,
  );
  // 10. Verify all posts are from subscribed community
  for (const post of feed.data) {
    TestValidator.equals(
      "all posts from subscribed community",
      post.community.id,
      community1.id,
    );
  }
}