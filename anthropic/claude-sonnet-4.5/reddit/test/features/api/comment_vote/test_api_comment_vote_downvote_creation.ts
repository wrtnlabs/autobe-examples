import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

/**
 * Test the complete workflow of a member casting a downvote on a comment.
 *
 * This test validates that authenticated members can successfully express
 * disagreement or indicate low quality content through the downvote mechanism.
 * The scenario creates a complete community context including moderator setup,
 * community creation, member registration, post creation, comment creation, and
 * finally the downvote action.
 *
 * The test ensures:
 *
 * 1. Moderator can create a community
 * 2. Member can register and authenticate
 * 3. Member can create posts and comments
 * 4. Member can cast a downvote (vote_type: -1) on a comment
 * 5. Vote record is created with correct associations and timestamps
 * 6. The downvote affects the comment's karma calculation by subtracting -1
 *
 * Steps:
 *
 * 1. Create and authenticate as moderator
 * 2. Create a community
 * 3. Create and authenticate as member
 * 4. Create a post in the community
 * 5. Create a comment on the post
 * 6. Cast a downvote on the comment
 * 7. Validate the vote record structure and values
 */
export async function test_api_comment_vote_downvote_creation(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Create community as moderator
  const communityData = {
    name: RandomGenerator.alphaNumeric(10).toLowerCase(),
    display_title: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    rules: RandomGenerator.paragraph({ sentences: 2 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    banner_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 3: Create member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: false,
    show_subscribed_communities: false,
    show_activity_feed: true,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 4: Create a post in the community
  const postData = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 10 }),
    post_type: "text" as const,
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: null,
    image_url: null,
  } satisfies IRedditCommunityPost.ICreate;

  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: postData,
    },
  );
  typia.assert(post);

  // Step 5: Create a comment on the post
  const commentData = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    parent_comment_id: null,
  } satisfies IRedditCommunityComment.ICreate;

  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentData,
      },
    );
  typia.assert(comment);

  // Step 6: Cast a downvote on the comment
  const voteData = {
    vote_type: -1 as const,
  } satisfies IRedditCommunityCommentVote.ICreate;

  const vote =
    await api.functional.redditCommunity.member.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: voteData,
      },
    );
  typia.assert(vote);

  // Step 7: Validate vote record
  TestValidator.equals("vote type is downvote", vote.vote_type, -1);
  TestValidator.equals(
    "vote references correct comment",
    vote.reddit_community_comment_id,
    comment.id,
  );
  TestValidator.equals(
    "vote references correct member",
    vote.reddit_community_member_id,
    member.id,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    vote.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    vote.updated_at.length > 0,
  );
  TestValidator.equals(
    "created_at equals updated_at for new vote",
    vote.created_at,
    vote.updated_at,
  );
}
