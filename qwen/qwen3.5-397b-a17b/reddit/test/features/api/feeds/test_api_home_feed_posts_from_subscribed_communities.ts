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

export async function test_api_home_feed_posts_from_subscribed_communities(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and get authenticated connection
  const memberAuth = await authorize_member_join(connection, {
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
  typia.assert(memberAuth);
  // Create member-specific connection with authorization token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAuth.token.access,
    },
  };
  // 2. Create 3 communities
  const community1 = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: `community_subscribed_1_${RandomGenerator.alphabets(5)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: typia.random<string & tags.Format<"uri">>() satisfies string as string,
      },
    },
  );
  typia.assert(community1);
  const community2 = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: `community_subscribed_2_${RandomGenerator.alphabets(5)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: typia.random<string & tags.Format<"uri">>() satisfies string as string,
      },
    },
  );
  typia.assert(community2);
  const community3 = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: `community_unsubscribed_${RandomGenerator.alphabets(5)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: typia.random<string & tags.Format<"uri">>() satisfies string as string,
      },
    },
  );
  typia.assert(community3);
  // 3. Subscribe member to only community1 and community2 (NOT community3)
  const subscription1 =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community1.id,
        } satisfies IRedditCloneSubscription.ICreate,
      },
    );
  typia.assert(subscription1);
  const subscription2 =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community2.id,
        } satisfies IRedditCloneSubscription.ICreate,
      },
    );
  typia.assert(subscription2);
  // 4. Create posts in all 3 communities with different post types
  // Post in subscribed community1 (TEXT type)
  const post1 = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "TEXT",
        community_id: community1.id,
        text: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        },
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post1);
  // Post in subscribed community2 (LINK type)
  const post2 = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "LINK",
        community_id: community2.id,
        link: {
          url: typia.random<string & tags.Format<"uri">>(),
        },
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post2);
  // Post in subscribed community1 (IMAGE type)
  const post3 = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "IMAGE",
        community_id: community1.id,
        image: {
          fileUri: typia.random<string & tags.Format<"uri">>(),
        },
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post3);
  // Post in UNSUBSCRIBED community3 (TEXT type) - should NOT appear in feed
  const post4 = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "TEXT",
        community_id: community3.id,
        text: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        },
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post4);
  // 5. Call home feed endpoint
  const feedResponse = await api.functional.redditClone.member.feeds.home.index(
    memberConnection,
    {
      body: {
        sort: "new",
        page: 1,
        limit: 20,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(feedResponse);
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "pagination exists",
    feedResponse.pagination !== undefined,
  );
  TestValidator.equals("current page", feedResponse.pagination.current, 1);
  TestValidator.predicate(
    "limit is positive",
    feedResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    feedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    feedResponse.pagination.pages >= 0,
  );
  // 7. Validate that all posts in feed are from subscribed communities only
  const subscribedCommunityIds = [community1.id, community2.id];
  for (const post of feedResponse.data) {
    // Verify post is from a subscribed community
    const isFromSubscribedCommunity = subscribedCommunityIds.includes(
      post.community.id,
    );
    TestValidator.predicate(
      `post ${post.id} is from subscribed community`,
      isFromSubscribedCommunity,
    );
    // Verify post summary has all required fields
    TestValidator.predicate("post has id", post.id !== undefined);
    TestValidator.predicate("post has title", post.title !== undefined);
    TestValidator.predicate("post has post_type", post.post_type !== undefined);
    TestValidator.predicate("post has author", post.author !== undefined);
    TestValidator.predicate("post has community", post.community !== undefined);
    TestValidator.predicate(
      "post has vote_score",
      post.vote_score !== undefined,
    );
    TestValidator.predicate(
      "post has comment_count",
      post.comment_count !== undefined,
    );
    TestValidator.predicate(
      "post has created_at",
      post.created_at !== undefined,
    );
    TestValidator.predicate("post has preview", post.preview !== undefined);
    // Verify author is the member who created the posts
    TestValidator.equals("author is member", post.author.id, memberAuth.id);
    // Verify vote score and comment count are integers
    TestValidator.predicate(
      "vote_score is integer",
      Number.isInteger(post.vote_score),
    );
    TestValidator.predicate(
      "comment_count is integer",
      Number.isInteger(post.comment_count),
    );
  }
  // 8. Verify that posts from unsubscribed community (community3) do NOT appear
  const postsFromUnsubscribedCommunity = feedResponse.data.filter(
    (post) => post.community.id === community3.id,
  );
  TestValidator.equals(
    "no posts from unsubscribed community",
    postsFromUnsubscribedCommunity.length,
    0,
  );
  // 9. Verify we got posts from both subscribed communities
  const postsFromCommunity1 = feedResponse.data.filter(
    (post) => post.community.id === community1.id,
  );
  const postsFromCommunity2 = feedResponse.data.filter(
    (post) => post.community.id === community2.id,
  );
  TestValidator.predicate(
    "has posts from community1",
    postsFromCommunity1.length > 0,
  );
  TestValidator.predicate(
    "has posts from community2",
    postsFromCommunity2.length > 0,
  );
  // 10. Verify total records matches data length
  TestValidator.equals(
    "pagination records matches data length",
    feedResponse.pagination.records,
    feedResponse.data.length,
  );
}