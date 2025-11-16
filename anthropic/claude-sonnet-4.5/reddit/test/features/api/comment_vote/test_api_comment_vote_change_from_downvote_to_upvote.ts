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
 * Test the vote modification workflow where a member changes their vote from
 * downvote to upvote on the same comment.
 *
 * This scenario validates the reverse direction of vote change, ensuring the
 * upsert behavior works bidirectionally. The test creates a new member account,
 * establishes a community context, creates a post, adds a comment, initially
 * casts a downvote (vote_type: -1) on the comment, and then submits a second
 * vote request with upvote (vote_type: 1) for the same comment. The test
 * validates that the system updates the existing vote record bidirectionally.
 *
 * Validation points include: the second vote request returns appropriate
 * success status, the vote_type is changed from -1 to 1, the vote ID remains
 * the same confirming update behavior, the updated_at timestamp reflects the
 * modification while created_at stays unchanged, and database integrity is
 * maintained with only one vote record per member-comment pair.
 *
 * This test ensures the voting system supports complete opinion reversal,
 * allowing members to transition from negative to positive feedback
 * seamlessly.
 */
export async function test_api_comment_vote_change_from_downvote_to_upvote(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for community creation
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    nickname: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create community as moderator
  const communityData = {
    name: RandomGenerator.alphaNumeric(10),
    display_title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    rules: RandomGenerator.paragraph({ sentences: 3 }),
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

  // Step 3: Create member account for voting
  const memberData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 4 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: false,
    show_subscribed_communities: false,
    show_activity_feed: true,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 4: Create a post in the community as member
  const postData = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    post_type: "text" as const,
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: null,
    image_url: null,
  } satisfies IRedditCommunityPost.ICreate;

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 5: Create a comment on the post
  const commentData = {
    body: RandomGenerator.paragraph({ sentences: 5 }),
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

  // Step 6: Cast initial downvote on the comment
  const downvoteData = {
    vote_type: -1 as const,
  } satisfies IRedditCommunityCommentVote.ICreate;

  const initialVote: IRedditCommunityCommentVote =
    await api.functional.redditCommunity.member.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: downvoteData,
      },
    );
  typia.assert(initialVote);

  // Validate initial downvote
  TestValidator.equals(
    "initial vote type is downvote",
    initialVote.vote_type,
    -1,
  );

  // Step 7: Change vote from downvote to upvote
  const upvoteData = {
    vote_type: 1 as const,
  } satisfies IRedditCommunityCommentVote.ICreate;

  const updatedVote: IRedditCommunityCommentVote =
    await api.functional.redditCommunity.member.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: upvoteData,
      },
    );
  typia.assert(updatedVote);

  // Step 8: Validate the vote was updated (not duplicated)
  TestValidator.equals(
    "vote ID remains the same confirming update behavior",
    updatedVote.id,
    initialVote.id,
  );
  TestValidator.equals(
    "vote type changed from downvote to upvote",
    updatedVote.vote_type,
    1,
  );
  TestValidator.equals(
    "created_at timestamp remains unchanged",
    updatedVote.created_at,
    initialVote.created_at,
  );
  TestValidator.predicate(
    "updated_at timestamp reflects the modification",
    new Date(updatedVote.updated_at).getTime() >=
      new Date(initialVote.updated_at).getTime(),
  );
}
