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
 * Test retrieving a member's vote status on a comment after casting an upvote.
 *
 * This test validates the complete workflow of voting on a comment and then
 * retrieving the vote status. It ensures that the GET endpoint correctly
 * returns the member's existing upvote record for UI rendering purposes.
 *
 * Workflow:
 *
 * 1. Create and authenticate a moderator
 * 2. Moderator creates a community
 * 3. Create and authenticate a member
 * 4. Member creates a post in the community
 * 5. Member creates a comment on the post
 * 6. Member casts an upvote (vote_type: 1) on the comment
 * 7. Member retrieves their vote status on the comment
 * 8. Validate the vote record matches the upvote cast
 *
 * Validation includes verifying the vote_type is 1, the comment ID matches, the
 * member ID matches, and all timestamps are valid.
 */
export async function test_api_comment_vote_retrieval_after_upvote(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://test.example.com/moderator/join" satisfies string &
      tags.Format<"uri">,
    referrer: "" satisfies string & tags.Format<"uri">,
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Moderator creates a community
  const communityName = RandomGenerator.alphaNumeric(10).toLowerCase();
  const communityData = {
    name: communityName,
    display_title: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 7,
    }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    rules: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
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

  // Step 3: Create and authenticate member
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 4, wordMin: 5, wordMax: 10 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: true,
    show_subscribed_communities: false,
    show_activity_feed: true,
    ip: "127.0.0.1",
    href: "https://test.example.com/member/join" satisfies string &
      tags.Format<"uri">,
    referrer: "" satisfies string & tags.Format<"uri">,
  } satisfies IRedditCommunityGuest.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 4: Member creates a post in the community
  const postData = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    post_type: "text" as const,
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
  } satisfies IRedditCommunityPost.ICreate;

  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: postData,
    },
  );
  typia.assert(post);

  // Step 5: Member creates a comment on the post
  const commentData = {
    body: RandomGenerator.paragraph({ sentences: 5, wordMin: 4, wordMax: 8 }),
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

  // Step 6: Member casts an upvote on the comment
  const voteData = {
    vote_type: 1 as const,
  } satisfies IRedditCommunityCommentVote.ICreate;

  const createdVote =
    await api.functional.redditCommunity.member.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: voteData,
      },
    );
  typia.assert(createdVote);

  // Step 7: Member retrieves their vote status on the comment
  const retrievedVote =
    await api.functional.redditCommunity.member.comments.votes.at(connection, {
      commentId: comment.id,
    });
  typia.assert(retrievedVote);

  // Step 8: Validate the vote record
  TestValidator.equals("vote ID matches", retrievedVote.id, createdVote.id);
  TestValidator.equals("vote type is upvote", retrievedVote.vote_type, 1);
  TestValidator.equals(
    "comment ID matches",
    retrievedVote.reddit_community_comment_id,
    comment.id,
  );
  TestValidator.equals(
    "member ID matches",
    retrievedVote.reddit_community_member_id,
    member.id,
  );
  TestValidator.equals(
    "created_at matches",
    retrievedVote.created_at,
    createdVote.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrievedVote.updated_at,
    createdVote.updated_at,
  );
}
