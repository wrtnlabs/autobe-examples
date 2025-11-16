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
 * Test retrieving a member's vote status on a comment after casting a downvote.
 *
 * This scenario validates that the system correctly returns a member's existing
 * downvote record when queried via the GET votes endpoint. This functionality
 * is essential for UI rendering, allowing the platform to display the correct
 * vote button state (showing which comments the user has downvoted).
 *
 * Test Flow:
 *
 * 1. Create and authenticate a member account (the voter)
 * 2. Create and authenticate a moderator account
 * 3. Moderator creates a community
 * 4. Member creates a post in the community
 * 5. Member creates a comment on the post
 * 6. Member casts a downvote (vote_type: -1) on the comment
 * 7. Member retrieves their vote status on the comment
 * 8. Validate the retrieved vote record shows the downvote
 *
 * Validation Criteria:
 *
 * - Vote record is successfully retrieved (not null)
 * - Vote_type is -1 (indicating downvote)
 * - Reddit_community_comment_id matches the target comment
 * - Reddit_community_member_id matches the authenticated member
 * - Timestamps are present and valid
 */
export async function test_api_comment_vote_retrieval_after_downvote(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<50>
  >();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 2: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderatorNickname = RandomGenerator.name();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: moderatorNickname,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Moderator creates a community
  const communityName = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<21> &
      tags.Pattern<"^[a-z0-9_]+$">
  >();
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityName,
          display_title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          rules: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Switch to member context and create a post
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ILogin,
  });

  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 5: Create a comment on the post
  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 6: Cast a downvote on the comment
  const createdVote =
    await api.functional.redditCommunity.member.comments.votes.create(
      connection,
      {
        commentId: comment.id,
        body: {
          vote_type: -1,
        } satisfies IRedditCommunityCommentVote.ICreate,
      },
    );
  typia.assert(createdVote);

  // Step 7: Retrieve the vote status
  const retrievedVote =
    await api.functional.redditCommunity.member.comments.votes.at(connection, {
      commentId: comment.id,
    });
  typia.assert(retrievedVote);

  // Step 8: Validate the retrieved vote record
  TestValidator.equals("vote type is downvote", retrievedVote.vote_type, -1);
  TestValidator.equals(
    "vote comment ID matches",
    retrievedVote.reddit_community_comment_id,
    comment.id,
  );
  TestValidator.equals(
    "vote member ID matches",
    retrievedVote.reddit_community_member_id,
    member.id,
  );
  TestValidator.equals(
    "retrieved vote ID matches created vote",
    retrievedVote.id,
    createdVote.id,
  );

  // Validate timestamps exist and are valid
  typia.assert<string & tags.Format<"date-time">>(retrievedVote.created_at);
  typia.assert<string & tags.Format<"date-time">>(retrievedVote.updated_at);
}
