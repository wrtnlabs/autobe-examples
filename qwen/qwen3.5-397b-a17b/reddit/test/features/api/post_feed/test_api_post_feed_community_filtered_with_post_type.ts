import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
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
import { generate_random_reddit_community_member_posts_vote_create } from "../../../generate/generate_random_reddit_community_member_posts_vote_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post_vote } from "../../../prepare/prepare_random_reddit_community_post_vote";

/**
 * Test community-specific feed with post type filtering and minimum score threshold.
 *
 * This test validates that the community feed endpoint correctly filters posts
 * by post type (text, link, image) and minimum vote score threshold.
 */
export async function test_api_post_feed_community_filtered_with_post_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Create posts of different types
  // Text post
  const textPost = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(textPost);
  // Link post
  const linkPost = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "link",
        link_url: "https://example.com/article/test",
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(linkPost);
  // Image post
  const imagePost = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "image",
        image_path: "/images/test-image.jpg",
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(imagePost);
  // 5. Vote on posts to create varying scores
  // Give text post high score (5 upvotes)
  for (let i = 0; i < 5; i++) {
    const voterConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(voterConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCommunityMember.IJoin,
    });
    await api.functional.redditCommunity.member.posts.vote.create(
      voterConnection,
      {
        postId: textPost.id,
        body: {
          direction: "UPVOTE",
        } satisfies IRedditCommunityPostVote.ICreate,
      },
    );
  }
  // Give link post low score (1 upvote)
  const lowVoterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(lowVoterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  await api.functional.redditCommunity.member.posts.vote.create(
    lowVoterConnection,
    {
      postId: linkPost.id,
      body: { direction: "UPVOTE" } satisfies IRedditCommunityPostVote.ICreate,
    },
  );
  // Give image post negative score (2 downvotes)
  for (let i = 0; i < 2; i++) {
    const downvoterConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(downvoterConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCommunityMember.IJoin,
    });
    await api.functional.redditCommunity.member.posts.vote.create(
      downvoterConnection,
      {
        postId: imagePost.id,
        body: {
          direction: "DOWNVOTE",
        } satisfies IRedditCommunityPostVote.ICreate,
      },
    );
  }
  // 6. Test community feed with postType filter='text'
  const textPostsResult =
    await api.functional.redditCommunity.member.posts.index(memberConnection, {
      body: {
        feedType: "community",
        communityName: community.name,
        postType: "text",
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityPost.IRequest,
    });
  typia.assert(textPostsResult);
  TestValidator.predicate("text filter returns only text posts", () =>
    textPostsResult.data.every((post) => post.post_type === "text"),
  );
  TestValidator.predicate("text posts have text_preview", () =>
    textPostsResult.data.every((post) => post.text_preview !== null),
  );
  TestValidator.predicate("text posts have null link_domain", () =>
    textPostsResult.data.every((post) => post.link_domain === null),
  );
  TestValidator.predicate("text posts have null image_thumbnail", () =>
    textPostsResult.data.every((post) => post.image_thumbnail === null),
  );
  // 7. Test community feed with postType filter='link'
  const linkPostsResult =
    await api.functional.redditCommunity.member.posts.index(memberConnection, {
      body: {
        feedType: "community",
        communityName: community.name,
        postType: "link",
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityPost.IRequest,
    });
  typia.assert(linkPostsResult);
  TestValidator.predicate("link filter returns only link posts", () =>
    linkPostsResult.data.every((post) => post.post_type === "link"),
  );
  TestValidator.predicate("link posts have link_domain", () =>
    linkPostsResult.data.every((post) => post.link_domain !== null),
  );
  TestValidator.predicate("link posts have null text_preview", () =>
    linkPostsResult.data.every((post) => post.text_preview === null),
  );
  TestValidator.predicate("link posts have null image_thumbnail", () =>
    linkPostsResult.data.every((post) => post.image_thumbnail === null),
  );
  // 8. Test community feed with postType filter='image'
  const imagePostsResult =
    await api.functional.redditCommunity.member.posts.index(memberConnection, {
      body: {
        feedType: "community",
        communityName: community.name,
        postType: "image",
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityPost.IRequest,
    });
  typia.assert(imagePostsResult);
  TestValidator.predicate("image filter returns only image posts", () =>
    imagePostsResult.data.every((post) => post.post_type === "image"),
  );
  TestValidator.predicate("image posts have image_thumbnail", () =>
    imagePostsResult.data.every((post) => post.image_thumbnail !== null),
  );
  TestValidator.predicate("image posts have null text_preview", () =>
    imagePostsResult.data.every((post) => post.text_preview === null),
  );
  TestValidator.predicate("image posts have null link_domain", () =>
    imagePostsResult.data.every((post) => post.link_domain === null),
  );
  // 9. Test minScore filter - only posts with score >= 3
  const highScorePostsResult =
    await api.functional.redditCommunity.member.posts.index(memberConnection, {
      body: {
        feedType: "community",
        communityName: community.name,
        minScore: 3,
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityPost.IRequest,
    });
  typia.assert(highScorePostsResult);
  TestValidator.predicate("minScore filter returns only high score posts", () =>
    highScorePostsResult.data.every((post) => post.vote_score >= 3),
  );
  TestValidator.predicate(
    "text post (score 5) included in high score results",
    () => highScorePostsResult.data.some((post) => post.id === textPost.id),
  );
  // 10. Test pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    () => textPostsResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 20",
    () => textPostsResult.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination records matches data length",
    () => textPostsResult.pagination.records >= textPostsResult.data.length,
  );
}
