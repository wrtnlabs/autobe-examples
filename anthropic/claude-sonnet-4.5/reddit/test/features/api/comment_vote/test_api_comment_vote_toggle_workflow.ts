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
 * Test the complete vote lifecycle workflow on a comment.
 *
 * This test validates the full range of voting interactions available to
 * members on comment content. It verifies that a member can:
 *
 * 1. Cast an initial upvote on a comment
 * 2. Change their vote to the opposite type (downvote)
 * 3. Remove their vote entirely
 *
 * The test establishes the necessary context by creating a moderator account
 * and community, then a member account that creates both a post and a comment
 * on that post. A second member account is created to perform the voting
 * operations.
 *
 * The workflow validates three distinct voting operations in sequence:
 *
 * - Initial upvote creation
 * - Vote type change from upvote to downvote
 * - Complete vote removal
 *
 * Each operation properly updates the vote record and returns the complete vote
 * information to the client.
 */
export async function test_api_comment_vote_toggle_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    nickname: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Create community
  const communityData = {
    name: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<21> &
        tags.Pattern<"^[a-z0-9_]+$">
    >(),
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

  // Step 3: Create first member account (post and comment author)
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Password = typia.random<string & tags.MinLength<8>>();

  const member1Data = {
    username: typia.random<string & tags.MinLength<3> & tags.MaxLength<50>>(),
    email: member1Email,
    password: member1Password,
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

  const member1 = await api.functional.auth.member.join(connection, {
    body: member1Data,
  });
  typia.assert(member1);

  // Step 4: Create post in the community
  const postData = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    post_type: RandomGenerator.pick(["text", "link", "image"] as const),
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

  // Step 5: Create comment on the post
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

  // Step 6: Create second member account (voter)
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Password = typia.random<string & tags.MinLength<8>>();

  const member2Data = {
    username: typia.random<string & tags.MinLength<3> & tags.MaxLength<50>>(),
    email: member2Email,
    password: member2Password,
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 1 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: true,
    show_subscribed_communities: true,
    show_activity_feed: true,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const member2 = await api.functional.auth.member.join(connection, {
    body: member2Data,
  });
  typia.assert(member2);

  // Step 7: Cast initial upvote
  const upvoteData = {
    vote_type: 1 as const,
  } satisfies IRedditCommunityCommentVote.ICreate;

  const upvote =
    await api.functional.redditCommunity.member.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: upvoteData,
      },
    );
  typia.assert(upvote);
  TestValidator.equals("initial vote is upvote", upvote.vote_type, 1);
  TestValidator.equals(
    "vote targets correct comment",
    upvote.reddit_community_comment_id,
    comment.id,
  );
  TestValidator.equals(
    "vote belongs to member2",
    upvote.reddit_community_member_id,
    member2.id,
  );

  // Step 8: Change vote to downvote
  const downvoteData = {
    vote_type: -1 as const,
  } satisfies IRedditCommunityCommentVote.ICreate;

  const downvote =
    await api.functional.redditCommunity.member.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: downvoteData,
      },
    );
  typia.assert(downvote);
  TestValidator.equals("vote changed to downvote", downvote.vote_type, -1);
  TestValidator.equals(
    "vote still targets correct comment",
    downvote.reddit_community_comment_id,
    comment.id,
  );

  // Step 9: Remove vote entirely
  const removedVote =
    await api.functional.redditCommunity.member.comments.votes.erase(
      connection,
      {
        commentId: comment.id,
      },
    );
  typia.assert(removedVote);
}
