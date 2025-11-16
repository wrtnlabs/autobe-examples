import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";

/**
 * Validate that only the original voter may update or remove their own vote.
 *
 * This test ensures proper authorization by covering both successful vote
 * creation and failed attempts by another user to change or remove that vote.
 * The scenario is as follows:
 *
 * 1. Register User A (original voter) and User B (non-voter)
 * 2. User A creates a community
 * 3. User A creates a post within that community
 * 4. User A casts a vote on the post
 * 5. User B attempts to update User A's vote (should fail)
 * 6. User B attempts to remove User A's vote (should fail)
 *
 * This validates that only the original voter can update/delete their vote,
 * enforcing access control.
 */
export async function test_api_post_vote_update_voter_authorization(
  connection: api.IConnection,
) {
  // 1. Register User A and log in
  const userA_email = typia.random<string & tags.Format<"email">>();
  const userA_password = RandomGenerator.alphaNumeric(12);
  const userA: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userA_email,
        password: userA_password,
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(userA);

  // 2. User A creates a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: RandomGenerator.alphaNumeric(12),
        display_title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 8,
        }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 20,
          wordMin: 3,
          wordMax: 7,
        }),
        visibility: "public",
        status: "active",
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);

  // 3. User A creates a post in the community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.user.posts.create(connection, {
      body: {
        type: "text",
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 4,
          wordMax: 12,
        }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 12,
          wordMin: 3,
          wordMax: 8,
        }),
        status: "published",
        community_id: community.id,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 4. User A creates an initial post vote (upvote)
  const vote: ICommunityPlatformPostVote =
    await api.functional.communityPlatform.user.postVotes.create(connection, {
      body: {
        community_platform_post_id: post.id,
        vote_type: "up",
      } satisfies ICommunityPlatformPostVote.ICreate,
    });
  typia.assert(vote);

  // 5. Register User B and log in (switch authentication)
  const userB_email = typia.random<string & tags.Format<"email">>();
  const userB_password = RandomGenerator.alphaNumeric(12);
  const userB: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userB_email,
        password: userB_password,
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(userB);

  // 6. User B attempts to update User A's vote (should fail)
  await TestValidator.error("User B cannot update User A's vote", async () => {
    await api.functional.communityPlatform.user.postVotes.update(connection, {
      postVoteId: vote.id,
      body: {
        vote_type: "down",
      } satisfies ICommunityPlatformPostVote.IUpdate,
    });
  });

  // 7. User B attempts to remove (soft-delete) User A's vote (should fail)
  await TestValidator.error("User B cannot remove User A's vote", async () => {
    await api.functional.communityPlatform.user.postVotes.update(connection, {
      postVoteId: vote.id,
      body: {
        // No vote_type means soft-delete
      } satisfies ICommunityPlatformPostVote.IUpdate,
    });
  });
}
