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
 * Test community feed pagination and content filtering functionality.
 *
 * This test validates:
 * 1. Pagination works correctly with limit and page parameters
 * 2. Post type filtering (text, link, image) returns correct posts
 * 3. Minimum score filtering works as expected
 * 4. All returned posts belong to the specified community
 *
 * Test flow:
 * - Create member account and authenticate
 * - Create a test community
 * - Create 25 posts with mixed types (10 text, 8 link, 7 image)
 * - Vote on posts to create varying scores
 * - Test pagination (page 1 and page 2)
 * - Test post type filters
 * - Test minScore filter
 */
export async function test_api_community_feed_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Create a community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          iconImageUri: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create 25 posts with mixed types for pagination testing
  const posts: IRedditCommunityPost[] = [];
  // Create 10 text posts
  for (let i = 0; i < 10; i++) {
    const post = await api.functional.redditCommunity.member.posts.create(
      memberConnection,
      {
        body: {
          post_type: "text",
          title: `Text Post ${i + 1}`,
          text_content: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    );
    typia.assert(post);
    posts.push(post);
  }
  // Create 8 link posts
  for (let i = 0; i < 8; i++) {
    const post = await api.functional.redditCommunity.member.posts.create(
      memberConnection,
      {
        body: {
          post_type: "link",
          title: `Link Post ${i + 1}`,
          link_url: `https://example${i + 1}.com/page`,
        },
      },
    );
    typia.assert(post);
    posts.push(post);
  }
  // Create 7 image posts
  for (let i = 0; i < 7; i++) {
    const post = await api.functional.redditCommunity.member.posts.create(
      memberConnection,
      {
        body: {
          post_type: "image",
          title: `Image Post ${i + 1}`,
          image_path: `/images/test${i + 1}.jpg`,
        },
      },
    );
    typia.assert(post);
    posts.push(post);
  }
  TestValidator.equals("total posts created", posts.length, 25);
  // 4. Vote on some posts to create varying scores
  // Upvote first 5 text posts to give them positive scores
  for (let i = 0; i < 5; i++) {
    const vote = await api.functional.redditCommunity.member.posts.vote.create(
      memberConnection,
      {
        postId: posts[i].id,
        body: {
          direction: "UPVOTE",
        } satisfies IRedditCommunityPostVote.ICreate,
      },
    );
    typia.assert(vote);
  }
  // 5. Test pagination - first page with limit=20
  const page1 =
    await api.functional.redditCommunity.member.communities.feed.index(
      memberConnection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: 20,
          sort: "new",
          feedType: "community",
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 20);
  TestValidator.equals("page 1 total records", page1.pagination.records, 25);
  TestValidator.equals("page 1 total pages", page1.pagination.pages, 2);
  TestValidator.predicate("page 1 has 20 posts", page1.data.length === 20);
  // Verify all posts on page 1 belong to the community
  for (const post of page1.data) {
    TestValidator.equals(
      "post community matches",
      post.community.id,
      community.id,
    );
  }
  // 6. Test pagination - second page
  const page2 =
    await api.functional.redditCommunity.member.communities.feed.index(
      memberConnection,
      {
        communityName: community.name,
        body: {
          page: 2,
          limit: 20,
          sort: "new",
          feedType: "community",
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 20);
  TestValidator.predicate(
    "page 2 has remaining posts",
    page2.data.length === 5,
  );
  // Verify page 1 and page 2 have different posts
  const page1Ids = page1.data.map((p) => p.id);
  const page2Ids = page2.data.map((p) => p.id);
  for (const id of page2Ids) {
    TestValidator.predicate(
      "page 2 posts are unique from page 1",
      !page1Ids.includes(id),
    );
  }
  // 7. Test filtering by postType='text'
  const textPosts =
    await api.functional.redditCommunity.member.communities.feed.index(
      memberConnection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: 100,
          sort: "new",
          feedType: "community",
          postType: "text",
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(textPosts);
  TestValidator.predicate(
    "text filter returns only text posts",
    textPosts.data.every((p) => p.post_type === "text"),
  );
  TestValidator.equals("text post count", textPosts.data.length, 10);
  // 8. Test filtering by postType='link'
  const linkPosts =
    await api.functional.redditCommunity.member.communities.feed.index(
      memberConnection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: 100,
          sort: "new",
          feedType: "community",
          postType: "link",
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(linkPosts);
  TestValidator.predicate(
    "link filter returns only link posts",
    linkPosts.data.every((p) => p.post_type === "link"),
  );
  TestValidator.equals("link post count", linkPosts.data.length, 8);
  // 9. Test filtering by postType='image'
  const imagePosts =
    await api.functional.redditCommunity.member.communities.feed.index(
      memberConnection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: 100,
          sort: "new",
          feedType: "community",
          postType: "image",
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(imagePosts);
  TestValidator.predicate(
    "image filter returns only image posts",
    imagePosts.data.every((p) => p.post_type === "image"),
  );
  TestValidator.equals("image post count", imagePosts.data.length, 7);
  // 10. Test minScore filter - only posts with score >= 1 (the upvoted ones)
  const highScorePosts =
    await api.functional.redditCommunity.member.communities.feed.index(
      memberConnection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: 100,
          sort: "new",
          feedType: "community",
          minScore: 1,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(highScorePosts);
  TestValidator.predicate(
    "minScore filter returns posts with score >= 1",
    highScorePosts.data.every((p) => p.vote_score >= 1),
  );
  TestValidator.predicate(
    "minScore returns upvoted posts",
    highScorePosts.data.length <= 5,
  );
  // 11. Verify all filtered posts belong to the community
  for (const post of textPosts.data) {
    TestValidator.equals(
      "text post community matches",
      post.community.id,
      community.id,
    );
  }
  for (const post of linkPosts.data) {
    TestValidator.equals(
      "link post community matches",
      post.community.id,
      community.id,
    );
  }
  for (const post of imagePosts.data) {
    TestValidator.equals(
      "image post community matches",
      post.community.id,
      community.id,
    );
  }
  for (const post of highScorePosts.data) {
    TestValidator.equals(
      "high score post community matches",
      post.community.id,
      community.id,
    );
  }
}
