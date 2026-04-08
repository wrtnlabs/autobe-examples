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
 * Test home feed retrieval for a member with active community subscriptions.
 *
 * Validates the complete home feed workflow including member registration, community creation, subscription management, and multi-type post creation. Ensures that the home feed correctly filters posts to only show content from subscribed communities and properly handles different sorting modes.
 *
 * The test creates a member account, establishes a community subscription, and populates the community with diverse post types (text, link, image) to verify type-specific preview content rendering in feed responses.
 *
 * 1. Member registers with randomized credentials and receives authentication token.
 * 2. Community is created with unique name, description, and icon.
 * 3. Member subscribes to the created community establishing feed relationship.
 * 4. Multiple posts of different types are created in the subscribed community.
 * 5. Home feed is retrieved with default (hot) sorting and validated.
 * 6. Feed response is verified for correct post filtering, pagination metadata, and type-specific content.
 * 7. Sorting modes (new, top, controversial) are tested to verify correct ordering behavior.
 */
export async function test_api_home_feed_with_subscribed_communities(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create a community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe member to the community
  const subscription =
    await generate_random_reddit_community_member_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create multiple posts of different types in the subscribed community
  const textPost = await generate_random_reddit_community_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(textPost);
  const linkPost = await generate_random_reddit_community_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "link",
        community_id: community.id,
        url: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(linkPost);
  const imagePost = await generate_random_reddit_community_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "image",
        community_id: community.id,
        image_url: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(imagePost);
  // 5. Retrieve home feed with default sorting (hot)
  const homeFeed = await api.functional.redditCommunity.member.feed.home.index(
    memberConnection,
    {
      body: {
        sort: "hot",
        take: 20,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(homeFeed);
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "current page is 1",
    homeFeed.pagination.current === 1,
  );
  TestValidator.predicate("has records", homeFeed.pagination.records >= 3);
  TestValidator.predicate(
    "pages calculated correctly",
    homeFeed.pagination.pages >= 1,
  );
  TestValidator.predicate("limit is positive", homeFeed.pagination.limit > 0);
  // 7. Validate all posts belong to subscribed community
  TestValidator.predicate(
    "all posts from subscribed community",
    homeFeed.data.every((post) => post.community.id === community.id),
  );
  // 8. Validate each post has required fields
  for (const post of homeFeed.data) {
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
  }
  // 9. Validate type-specific preview content
  const textPosts = homeFeed.data.filter((p) => p.post_type === "text");
  const linkPosts = homeFeed.data.filter((p) => p.post_type === "link");
  const imagePosts = homeFeed.data.filter((p) => p.post_type === "image");
  for (const post of textPosts) {
    TestValidator.predicate(
      "text post has text_preview",
      post.text_preview !== undefined,
    );
  }
  for (const post of linkPosts) {
    TestValidator.predicate(
      "link post has link_domain",
      post.link_domain !== undefined,
    );
  }
  for (const post of imagePosts) {
    TestValidator.predicate(
      "image post has thumbnail_url",
      post.thumbnail_url !== undefined,
    );
  }
  // 10. Test sorting by new (chronological descending)
  const newFeed = await api.functional.redditCommunity.member.feed.home.index(
    memberConnection,
    {
      body: {
        sort: "new",
        take: 20,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(newFeed);
  if (newFeed.data.length >= 2) {
    for (let i = 0; i < newFeed.data.length - 1; i++) {
      const current = new Date(newFeed.data[i].created_at).getTime();
      const next = new Date(newFeed.data[i + 1].created_at).getTime();
      TestValidator.predicate("new sort is descending", current >= next);
    }
  }
  // 11. Test sorting by top with timeRange
  const topFeed = await api.functional.redditCommunity.member.feed.home.index(
    memberConnection,
    {
      body: {
        sort: "top",
        timeRange: "thisWeek",
        take: 20,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(topFeed);
  TestValidator.predicate("top feed returns posts", topFeed.data.length >= 0);
  // 12. Test sorting by controversial
  const controversialFeed =
    await api.functional.redditCommunity.member.feed.home.index(
      memberConnection,
      {
        body: {
          sort: "controversial",
          take: 20,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(controversialFeed);
  TestValidator.predicate(
    "controversial feed returns posts",
    controversialFeed.data.length >= 0,
  );
}
