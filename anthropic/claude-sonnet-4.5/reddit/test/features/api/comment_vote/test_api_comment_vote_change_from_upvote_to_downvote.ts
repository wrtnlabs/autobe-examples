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
 * Test vote modification workflow where a member changes their vote from upvote
 * to downvote.
 *
 * This test validates the upsert behavior of the comment voting system,
 * ensuring that when a member changes their vote on a comment, the system
 * updates the existing vote record instead of creating a duplicate. The test
 * verifies that vote_type changes from 1 (upvote) to -1 (downvote), the vote ID
 * remains constant, and timestamps are properly maintained.
 *
 * Test Flow:
 *
 * 1. Create moderator and member accounts for multi-actor testing
 * 2. Moderator creates a community to host content
 * 3. Member creates a post in the community
 * 4. Member creates a comment on the post
 * 5. Member casts initial upvote (vote_type: 1) on the comment
 * 6. Member changes vote to downvote (vote_type: -1) on the same comment
 * 7. Validate that the vote was updated (same ID) rather than duplicated
 * 8. Verify vote_type changed, updated_at changed, created_at unchanged
 */
export async function test_api_comment_vote_change_from_upvote_to_downvote(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for community creation
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    nickname: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create member account for voting
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    show_online_status: false,
    show_subscribed_communities: false,
    show_activity_feed: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const member: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 3: Switch to moderator context and create community
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorData.email,
      password: moderatorData.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  const communityData = {
    name: RandomGenerator.alphaNumeric(10).toLowerCase(),
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

  // Step 4: Switch to member context and create post
  await api.functional.auth.member.login(connection, {
    body: {
      username: memberData.username,
      password: memberData.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ILogin,
  });

  const postData = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    post_type: "text" as const,
    body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditCommunityPost.ICreate;

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 5: Create comment on the post
  const commentData = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
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

  // Step 6: Cast initial upvote on the comment
  const upvoteData = {
    vote_type: 1 as const,
  } satisfies IRedditCommunityCommentVote.ICreate;

  const upvote: IRedditCommunityCommentVote =
    await api.functional.redditCommunity.member.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: upvoteData,
      },
    );
  typia.assert(upvote);

  // Validate initial upvote
  TestValidator.equals("initial vote type is upvote", upvote.vote_type, 1);
  TestValidator.equals(
    "vote targets correct comment",
    upvote.reddit_community_comment_id,
    comment.id,
  );
  TestValidator.equals(
    "vote belongs to member",
    upvote.reddit_community_member_id,
    member.id,
  );

  // Store initial vote details for comparison
  const initialVoteId = upvote.id;
  const initialCreatedAt = upvote.created_at;
  const initialUpdatedAt = upvote.updated_at;

  // Step 7: Change vote to downvote on the same comment
  const downvoteData = {
    vote_type: -1 as const,
  } satisfies IRedditCommunityCommentVote.ICreate;

  const downvote: IRedditCommunityCommentVote =
    await api.functional.redditCommunity.member.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: downvoteData,
      },
    );
  typia.assert(downvote);

  // Step 8: Validate vote update behavior (upsert semantics)
  TestValidator.equals(
    "vote ID remains the same after update",
    downvote.id,
    initialVoteId,
  );

  TestValidator.equals(
    "vote type changed from upvote to downvote",
    downvote.vote_type,
    -1,
  );

  TestValidator.equals(
    "created_at timestamp remains unchanged",
    downvote.created_at,
    initialCreatedAt,
  );

  TestValidator.predicate(
    "updated_at timestamp has changed",
    downvote.updated_at !== initialUpdatedAt,
  );

  TestValidator.equals(
    "vote still targets the same comment",
    downvote.reddit_community_comment_id,
    comment.id,
  );

  TestValidator.equals(
    "vote still belongs to the same member",
    downvote.reddit_community_member_id,
    member.id,
  );
}
