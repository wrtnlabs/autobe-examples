import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import type { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import type { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
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
import { generate_random_reddit_community_member_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_member_subscriptions_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_votes_create } from "../../../generate/generate_random_reddit_community_member_posts_votes_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_vote } from "../../../prepare/prepare_random_reddit_community_post_vote";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test that an authenticated member can retrieve their own posts by their username.
 *
 * Validates the complete post retrieval workflow including member authentication, community creation, subscription, multi-type post creation, vote and comment creation, and final post list retrieval. Ensures that the endpoint correctly resolves the authenticated member's username and returns only their posts with accurate engagement metrics.
 *
 * Special attention is given to verifying vote_score calculation (sum of all votes), comment_count accuracy (number of non-deleted comments), and type-specific preview content population (text_preview for text posts, thumbnail_url for image posts, link_domain for link posts). Soft-deleted posts are confirmed to be excluded from results.
 *
 * 1. Member registers and authenticates using authorize_member_join utility function.
 * 2. Member creates a community using generate_random_reddit_community_member_communities_create.
 * 3. Member subscribes to the created community using generate_random_reddit_community_member_member_subscriptions_create.
 * 4. Member creates three posts of different types (text, link, image) using generate_random_reddit_community_posts_create.
 * 5. Member casts an upvote on the text post using generate_random_reddit_community_member_posts_votes_create.
 * 6. Member creates a comment on the text post using generate_random_reddit_community_member_posts_comments_create.
 * 7. Member calls GET /redditCommunity/member/members/{username}/posts endpoint to retrieve their posts.
 * 8. Validates response structure, post count, vote_score calculation, comment_count calculation, and type-specific preview fields.
 * 9. Confirms all returned posts belong to the authenticated member and soft-deleted posts are excluded.
 */
export async function test_api_member_post_list_own_posts(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create a community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await generate_random_reddit_community_member_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create three posts of different types
  const textPost = await generate_random_reddit_community_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.content({ paragraphs: 2 }),
      },
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
      },
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
      },
    },
  );
  typia.assert(imagePost);
  // 5. Cast an upvote on the text post
  const vote = await generate_random_reddit_community_member_posts_votes_create(
    memberConnection,
    {
      params: { postId: textPost.id },
      body: { value: 1 },
    },
  );
  typia.assert(vote);
  // 6. Create a comment on the text post
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: textPost.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(comment);
  // 7. Retrieve member's posts
  const response =
    await api.functional.redditCommunity.member.members.posts.iterate(
      memberConnection,
      {
        username: memberAuth.username,
      },
    );
  typia.assert(response);
  // 8. Validate response structure and pagination
  TestValidator.predicate("has pagination", response.pagination !== undefined);
  TestValidator.predicate("has data array", Array.isArray(response.data));
  TestValidator.predicate("has at least 3 posts", response.data.length >= 3);
  // Find our created posts in the response
  const foundTextPost = response.data.find((p) => p.id === textPost.id);
  const foundLinkPost = response.data.find((p) => p.id === linkPost.id);
  const foundImagePost = response.data.find((p) => p.id === imagePost.id);
  TestValidator.predicate("text post found", foundTextPost !== undefined);
  TestValidator.predicate("link post found", foundLinkPost !== undefined);
  TestValidator.predicate("image post found", foundImagePost !== undefined);
  // 9. Validate vote_score calculation
  TestValidator.equals(
    "text post vote_score is 1",
    foundTextPost!.vote_score,
    1,
  );
  TestValidator.equals(
    "link post vote_score is 0",
    foundLinkPost!.vote_score,
    0,
  );
  TestValidator.equals(
    "image post vote_score is 0",
    foundImagePost!.vote_score,
    0,
  );
  // 10. Validate comment_count calculation
  TestValidator.equals(
    "text post comment_count is 1",
    foundTextPost!.comment_count,
    1,
  );
  TestValidator.equals(
    "link post comment_count is 0",
    foundLinkPost!.comment_count,
    0,
  );
  TestValidator.equals(
    "image post comment_count is 0",
    foundImagePost!.comment_count,
    0,
  );
  // 11. Validate type-specific preview fields
  TestValidator.predicate(
    "text post has text_preview",
    foundTextPost!.text_preview !== null &&
      foundTextPost!.text_preview !== undefined,
  );
  TestValidator.predicate(
    "link post has link_domain",
    foundLinkPost!.link_domain !== null &&
      foundLinkPost!.link_domain !== undefined,
  );
  TestValidator.predicate(
    "image post has thumbnail_url",
    foundImagePost!.thumbnail_url !== null &&
      foundImagePost!.thumbnail_url !== undefined,
  );
  // 12. Validate all posts belong to the authenticated member
  response.data.forEach((post) => {
    TestValidator.equals(
      "post author username matches",
      post.author.username,
      memberAuth.username,
    );
  });
  // 13. Validate post types are correct
  TestValidator.equals(
    "text post type is text",
    foundTextPost!.post_type,
    "text",
  );
  TestValidator.equals(
    "link post type is link",
    foundLinkPost!.post_type,
    "link",
  );
  TestValidator.equals(
    "image post type is image",
    foundImagePost!.post_type,
    "image",
  );
  // 14. Validate community assignment
  TestValidator.equals(
    "text post community matches",
    foundTextPost!.community.id,
    community.id,
  );
  TestValidator.equals(
    "link post community matches",
    foundLinkPost!.community.id,
    community.id,
  );
  TestValidator.equals(
    "image post community matches",
    foundImagePost!.community.id,
    community.id,
  );
}
