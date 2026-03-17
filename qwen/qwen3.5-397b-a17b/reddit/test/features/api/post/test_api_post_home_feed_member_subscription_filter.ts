import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_post_home_feed_member_subscription_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create main member (test subject)
  const mainMemberConnection: api.IConnection = { host: connection.host };
  const mainMember = await authorize_member_join(mainMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(mainMember);
  // 2. Create 3 communities for testing
  const community1 = await generate_random_reddit_clone_communities_create(
    mainMemberConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community1);
  const community2 = await generate_random_reddit_clone_communities_create(
    mainMemberConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community2);
  const community3 = await generate_random_reddit_clone_communities_create(
    mainMemberConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community3);
  // 3. Subscribe main member to community1 and community2 ONLY (not community3)
  const subscription1 =
    await generate_random_reddit_clone_member_subscriptions_create(
      mainMemberConnection,
      {
        body: {
          community_id: community1.id,
        },
      },
    );
  typia.assert(subscription1);
  const subscription2 =
    await generate_random_reddit_clone_member_subscriptions_create(
      mainMemberConnection,
      {
        body: {
          community_id: community2.id,
        },
      },
    );
  typia.assert(subscription2);
  // 4. Create additional member to create posts in community3 (non-subscribed)
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherMember = await authorize_member_join(otherMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(otherMember);
  // Subscribe other member to community3 to enable posting
  await generate_random_reddit_clone_member_subscriptions_create(
    otherMemberConnection,
    {
      body: {
        community_id: community3.id,
      },
    },
  );
  // 5. Create posts in subscribed communities (community1 and community2)
  const postInCommunity1 =
    await generate_random_reddit_clone_member_posts_create(
      mainMemberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          post_type: "TEXT",
          community_id: community1.id,
          text: {
            body: RandomGenerator.content({ paragraphs: 2 }),
          },
        },
      },
    );
  typia.assert(postInCommunity1);
  const postInCommunity2 =
    await generate_random_reddit_clone_member_posts_create(
      mainMemberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          post_type: "TEXT",
          community_id: community2.id,
          text: {
            body: RandomGenerator.content({ paragraphs: 2 }),
          },
        },
      },
    );
  typia.assert(postInCommunity2);
  // 6. Create post in non-subscribed community (community3) by other member
  const postInCommunity3 =
    await generate_random_reddit_clone_member_posts_create(
      otherMemberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          post_type: "TEXT",
          community_id: community3.id,
          text: {
            body: RandomGenerator.content({ paragraphs: 2 }),
          },
        },
      },
    );
  typia.assert(postInCommunity3);
  // 7. Query home feed - should return only posts from subscribed communities
  const homeFeed = await api.functional.redditClone.posts.index(
    mainMemberConnection,
    {
      body: {
        sort: "new",
        page: 1,
        limit: 20,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(homeFeed);
  // 8. Validate pagination metadata
  TestValidator.predicate("has pagination", homeFeed.pagination !== undefined);
  TestValidator.predicate(
    "current page is 1",
    homeFeed.pagination.current === 1,
  );
  TestValidator.predicate("limit is 20", homeFeed.pagination.limit === 20);
  TestValidator.predicate("has posts", homeFeed.data.length > 0);
  // 9. Validate that ALL posts in home feed are from subscribed communities ONLY
  const subscribedCommunityIds = [community1.id, community2.id];
  for (const post of homeFeed.data) {
    TestValidator.predicate(
      `post ${post.id} is from subscribed community`,
      subscribedCommunityIds.includes(post.community.id),
    );
    TestValidator.notEquals(
      `post ${post.id} is NOT from non-subscribed community3`,
      post.community.id,
      community3.id,
    );
  }
  // 10. Verify posts from community1 and community2 are present
  const hasPostFromCommunity1 = homeFeed.data.some(
    (post) => post.community.id === community1.id,
  );
  const hasPostFromCommunity2 = homeFeed.data.some(
    (post) => post.community.id === community2.id,
  );
  TestValidator.predicate("has posts from community1", hasPostFromCommunity1);
  TestValidator.predicate("has posts from community2", hasPostFromCommunity2);
  // 11. Verify NO posts from community3 (non-subscribed) appear in home feed
  const hasPostFromCommunity3 = homeFeed.data.some(
    (post) => post.community.id === community3.id,
  );
  TestValidator.predicate(
    "no posts from non-subscribed community3",
    !hasPostFromCommunity3,
  );
  // 12. Verify member's own posts in subscribed communities are included
  const hasOwnPost = homeFeed.data.some(
    (post) => post.author.id === mainMember.id,
  );
  TestValidator.predicate("member's own posts included", hasOwnPost);
  // 13. Test pagination - fetch page 2 to ensure consistent filtering
  const homeFeedPage2 = await api.functional.redditClone.posts.index(
    mainMemberConnection,
    {
      body: {
        sort: "new",
        page: 2,
        limit: 20,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(homeFeedPage2);
  // Validate page 2 also only contains posts from subscribed communities
  for (const post of homeFeedPage2.data) {
    TestValidator.predicate(
      `page2 post ${post.id} is from subscribed community`,
      subscribedCommunityIds.includes(post.community.id),
    );
  }
  // Verify total records count is consistent
  TestValidator.predicate(
    "page2 current is 2",
    homeFeedPage2.pagination.current === 2,
  );
}
