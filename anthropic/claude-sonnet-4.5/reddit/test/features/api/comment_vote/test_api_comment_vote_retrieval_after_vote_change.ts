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
 * Test retrieving a member's vote status after they have changed their vote
 * from upvote to downvote.
 *
 * This scenario validates that the GET endpoint returns the updated vote record
 * reflecting the most recent vote choice, not historical states.
 *
 * The test creates a new member account, establishes a community context,
 * creates a post, adds a comment, casts an initial upvote (vote_type: 1),
 * changes the vote to a downvote (vote_type: -1) through a second POST request,
 * and then retrieves the vote status.
 *
 * Validation points include: the GET request returns HTTP 200, the response
 * contains the vote record with vote_type: -1 (current state, not the original
 * upvote), the updated_at timestamp is more recent than created_at, and the
 * vote ID remains consistent showing it's the same updated record.
 */
export async function test_api_comment_vote_retrieval_after_vote_change(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    nickname: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create community
  const communityData = {
    name: RandomGenerator.alphaNumeric(15).toLowerCase(),
    display_title: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    rules: RandomGenerator.paragraph({ sentences: 2 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
    banner_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 3: Create and authenticate member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: false,
    show_subscribed_communities: false,
    show_activity_feed: true,
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 4: Create a post in the community
  const postData = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 1 }),
    post_type: "text" as const,
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditCommunityPost.ICreate;

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 5: Create a comment on the post
  const commentData = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
    parent_comment_id: null,
  } satisfies IRedditCommunityComment.ICreate;

  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentData,
      },
    );
  typia.assert(comment);

  // Step 6: Cast initial upvote
  const upvoteData = {
    vote_type: 1 as const,
  } satisfies IRedditCommunityCommentVote.ICreate;

  const initialVote: IRedditCommunityCommentVote =
    await api.functional.redditCommunity.member.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: upvoteData,
      },
    );
  typia.assert(initialVote);

  // Verify initial vote is upvote
  TestValidator.equals("initial vote is upvote", initialVote.vote_type, 1);

  // Step 7: Change vote to downvote
  const downvoteData = {
    vote_type: -1 as const,
  } satisfies IRedditCommunityCommentVote.ICreate;

  const updatedVote: IRedditCommunityCommentVote =
    await api.functional.redditCommunity.member.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: downvoteData,
      },
    );
  typia.assert(updatedVote);

  // Verify updated vote is downvote
  TestValidator.equals("updated vote is downvote", updatedVote.vote_type, -1);

  // Verify same vote ID (updated, not replaced)
  TestValidator.equals(
    "vote ID remains consistent",
    updatedVote.id,
    initialVote.id,
  );

  // Step 8: Retrieve current vote status
  const retrievedVote: IRedditCommunityCommentVote =
    await api.functional.redditCommunity.member.comments.votes.at(connection, {
      commentId: comment.id,
    });
  typia.assert(retrievedVote);

  // Step 9: Validate retrieved vote reflects current state (downvote)
  TestValidator.equals(
    "retrieved vote type is downvote",
    retrievedVote.vote_type,
    -1,
  );

  TestValidator.equals(
    "retrieved vote ID matches",
    retrievedVote.id,
    updatedVote.id,
  );

  // Verify updated_at is more recent than created_at
  const createdTime = new Date(retrievedVote.created_at).getTime();
  const updatedTime = new Date(retrievedVote.updated_at).getTime();

  TestValidator.predicate(
    "updated_at is more recent than created_at",
    updatedTime > createdTime,
  );

  // Verify vote belongs to correct comment
  TestValidator.equals(
    "vote belongs to correct comment",
    retrievedVote.reddit_community_comment_id,
    comment.id,
  );

  // Verify vote belongs to correct member
  TestValidator.equals(
    "vote belongs to correct member",
    retrievedVote.reddit_community_member_id,
    member.id,
  );
}
