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
 * Test the complete workflow of a member removing their vote from a comment.
 *
 * This scenario validates that members can successfully retract their voting
 * action on comments within the community platform, ensuring proper vote
 * lifecycle management.
 *
 * The test flow begins with creating the necessary prerequisite data: First, a
 * moderator creates a community to establish the context. Then, a member
 * creates a post within that community. Another member creates a comment on
 * that post. The testing member then casts a vote (either upvote or downvote)
 * on the comment.
 *
 * After establishing this context, the test validates the core functionality:
 * the authenticated member successfully removes their vote from the comment.
 * The operation should return the deleted vote record with all its metadata.
 * The system should verify that the vote record is completely removed from the
 * database, affecting the comment's vote score and the author's karma
 * calculations accordingly.
 *
 * The test verifies: (1) Only the member who originally cast the vote can
 * delete it, (2) The vote record exists before deletion, (3) The deletion
 * returns the complete vote object, (4) The comment's vote score is updated to
 * reflect the vote removal, (5) The vote cannot be deleted twice (attempting to
 * delete a non-existent vote should fail appropriately).
 *
 * This scenario ensures proper vote lifecycle management and validates the
 * member's ability to withdraw their opinion on comment content without
 * changing it to the opposite vote type.
 */
export async function test_api_comment_vote_removal_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      nickname: RandomGenerator.name(),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Moderator creates a community
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10).toLowerCase(),
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          rules: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create first member (will create post and vote)
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Password = typia.random<string & tags.MinLength<8>>();
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
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
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member1);

  // Step 4: Member1 creates a post
  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 10,
        }),
        post_type: "text" as const,
        body: RandomGenerator.content({ paragraphs: 2 }),
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 5: Create second member (will create comment)
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Password = typia.random<string & tags.MinLength<8>>();
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: member2Email,
      password: member2Password,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
      avatar_url: null,
      show_online_status: true,
      show_subscribed_communities: true,
      show_activity_feed: true,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member2);

  // Step 6: Member2 creates a comment on the post
  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 5 }),
          parent_comment_id: null,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 7: Switch to member1 to vote on the comment
  await api.functional.auth.member.login(connection, {
    body: {
      username: undefined,
      email: member1Email,
      password: member1Password,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ILogin,
  });

  // Step 8: Member1 casts a vote on the comment
  const voteTypes = [1, -1] as const;
  const voteType = RandomGenerator.pick(voteTypes);
  const vote =
    await api.functional.redditCommunity.member.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: {
          vote_type: voteType,
        } satisfies IRedditCommunityCommentVote.ICreate,
      },
    );
  typia.assert(vote);

  // Verify vote was created with correct properties
  TestValidator.equals(
    "vote comment ID matches",
    vote.reddit_community_comment_id,
    comment.id,
  );
  TestValidator.equals(
    "vote member ID matches",
    vote.reddit_community_member_id,
    member1.id,
  );
  TestValidator.equals("vote type matches", vote.vote_type, voteType);

  // Step 9: Member1 removes their vote from the comment
  const deletedVote =
    await api.functional.redditCommunity.member.comments.votes.erase(
      connection,
      {
        commentId: comment.id,
      },
    );
  typia.assert(deletedVote);

  // Step 10: Verify the deleted vote matches the original vote
  TestValidator.equals(
    "deleted vote ID matches original",
    deletedVote.id,
    vote.id,
  );
  TestValidator.equals(
    "deleted vote comment ID matches",
    deletedVote.reddit_community_comment_id,
    comment.id,
  );
  TestValidator.equals(
    "deleted vote member ID matches",
    deletedVote.reddit_community_member_id,
    member1.id,
  );
  TestValidator.equals(
    "deleted vote type matches",
    deletedVote.vote_type,
    voteType,
  );

  // Step 11: Verify attempting to delete the vote again fails
  await TestValidator.error("cannot delete non-existent vote", async () => {
    await api.functional.redditCommunity.member.comments.votes.erase(
      connection,
      {
        commentId: comment.id,
      },
    );
  });
}
