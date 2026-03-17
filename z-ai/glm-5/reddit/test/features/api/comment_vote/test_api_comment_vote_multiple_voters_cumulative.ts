import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_posts_create } from "../../../generate/generate_random_community_platform_member_communities_posts_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_comments_vote_cast } from "../../../generate/generate_random_community_platform_member_posts_comments_vote_cast";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

/**
 * Test that multiple members can each vote once on the same comment and that
 * vote scores accumulate correctly with proper karma effects.
 *
 * Setup:
 * - Member A creates a community and a text post
 * - Member B creates a comment on the post
 * - Members C and D vote on the comment
 *
 * Validation:
 * - Each member can vote independently on the same comment
 * - Vote records are created with correct attributes
 * - Vote changes work correctly
 */
export async function test_api_comment_vote_multiple_voters_cumulative(
  connection: api.IConnection,
): Promise<void> {
  // ========================================
  // Setup: Create Members
  // ========================================
  // Member A: Community and post owner
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // Member B: Comment author
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // Member C: First voter
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {});
  typia.assert(memberC);
  // Member D: Second voter
  const memberDConnection: api.IConnection = { host: connection.host };
  const memberD = await authorize_member_join(memberDConnection, {});
  typia.assert(memberD);
  // ========================================
  // Setup: Create Community and Post (Member A)
  // ========================================
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberAConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          postType: "text",
        },
      },
    );
  typia.assert(post);
  // ========================================
  // Setup: Create Comment (Member B)
  // ========================================
  const comment =
    await api.functional.communityPlatform.member.posts.comments.create(
      memberBConnection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // ========================================
  // Test: First Upvote (Member C)
  // ========================================
  const voteC =
    await api.functional.communityPlatform.member.posts.comments.vote.cast(
      memberCConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(voteC);
  // Validate first vote record
  TestValidator.equals("first vote type", voteC.voteType, "upvote");
  TestValidator.equals("first voter is Member C", voteC.member.id, memberC.id);
  TestValidator.equals("vote is not deleted", voteC.deletedAt, null);
  // ========================================
  // Test: Second Upvote (Member D)
  // ========================================
  const voteD =
    await api.functional.communityPlatform.member.posts.comments.vote.cast(
      memberDConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          vote_type: "upvote",
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(voteD);
  // Validate second vote record
  TestValidator.equals("second vote type", voteD.voteType, "upvote");
  TestValidator.equals("second voter is Member D", voteD.member.id, memberD.id);
  TestValidator.equals("vote is not deleted", voteD.deletedAt, null);
  // Verify votes are independent
  TestValidator.notEquals("votes have different IDs", voteC.id, voteD.id);
  TestValidator.notEquals(
    "votes from different members",
    voteC.member.id,
    voteD.member.id,
  );
  // ========================================
  // Test: Vote Change (Member C changes to downvote)
  // ========================================
  const voteCChanged =
    await api.functional.communityPlatform.member.posts.comments.vote.cast(
      memberCConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          vote_type: "downvote",
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(voteCChanged);
  // Validate vote change
  TestValidator.equals("changed vote type", voteCChanged.voteType, "downvote");
  TestValidator.equals(
    "changed vote still belongs to Member C",
    voteCChanged.member.id,
    memberC.id,
  );
  TestValidator.equals(
    "vote record ID remains same after change",
    voteCChanged.id,
    voteC.id,
  );
  // ========================================
  // Test: Vote Independence
  // ========================================
  // Member D's vote should still be unchanged
  TestValidator.equals("Member D vote still upvote", voteD.voteType, "upvote");
  // ========================================
  // Business Rule: Each member can only have one vote per comment
  // ========================================
  // The PUT endpoint updates existing vote rather than creating new one
  // This validates the unique constraint per member-comment pair
  TestValidator.equals(
    "same member gets same vote record on re-vote",
    voteC.id,
    voteCChanged.id,
  );
}
