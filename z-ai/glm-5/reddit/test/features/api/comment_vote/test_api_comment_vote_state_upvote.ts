import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommentVote";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_comments_vote } from "../../../generate/generate_random_community_member_comments_vote";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_posts_create } from "../../../generate/generate_random_community_member_communities_posts_create";
import { generate_random_community_member_posts_comments_create } from "../../../generate/generate_random_community_member_posts_comments_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_comment_vote } from "../../../prepare/prepare_random_community_comment_vote";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

/**
 * Test retrieving an existing upvote state for a comment.
 *
 * This test validates that when a member upvotes a comment,
 * the GET vote state endpoint correctly returns the vote direction
 * and timestamps.
 *
 * Setup Steps:
 * 1. User 1 registers, creates community, creates post, creates comment
 * 2. User 2 registers, upvotes User 1's comment
 * 3. User 2 retrieves their vote state on the comment
 *
 * Validation:
 * - Vote state returns direction: 1 (upvote)
 * - Timestamps are valid ISO 8601 format
 */
export async function test_api_comment_vote_state_upvote(
  connection: api.IConnection,
): Promise<void> {
  // ========================================
  // Step 1: User 1 - Create community, post, and comment
  // ========================================
  const user1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(user1Connection, {});
  // Create community (auto-subscribes creator)
  const community = await generate_random_community_member_communities_create(
    user1Connection,
    {},
  );
  typia.assert(community);
  // Create post in the community
  const post = await generate_random_community_member_communities_posts_create(
    user1Connection,
    {
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // Create comment on the post
  const comment = await generate_random_community_member_posts_comments_create(
    user1Connection,
    {
      params: { postId: post.id },
    },
  );
  typia.assert(comment);
  // ========================================
  // Step 2: User 2 - Vote on comment
  // ========================================
  const user2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(user2Connection, {});
  // User 2 upvotes User 1's comment
  const voteResult = await generate_random_community_member_comments_vote(
    user2Connection,
    {
      params: { commentId: comment.id },
      body: { vote: 1 },
    },
  );
  typia.assert(voteResult);
  // ========================================
  // Step 3: Retrieve vote state
  // ========================================
  const voteState = await api.functional.community.member.comments._vote.at(
    user2Connection,
    {
      commentId: comment.id,
    },
  );
  typia.assert(voteState);
  // ========================================
  // Step 4: Validate vote state
  // ========================================
  TestValidator.equals("vote direction is upvote", voteState.direction, 1);
  TestValidator.predicate(
    "createdAt is valid date-time",
    () => !isNaN(new Date(voteState.createdAt).getTime()),
  );
  TestValidator.predicate(
    "updatedAt is valid date-time",
    () => !isNaN(new Date(voteState.updatedAt).getTime()),
  );
}
