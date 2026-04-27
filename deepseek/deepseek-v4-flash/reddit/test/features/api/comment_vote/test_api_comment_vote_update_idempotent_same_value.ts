import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
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
import { generate_random_community_platform_member_communities_subscribers_create } from "../../../generate/generate_random_community_platform_member_communities_subscribers_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_comments_votes_create } from "../../../generate/generate_random_community_platform_member_posts_comments_votes_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

/**
 * Test that updating a comment vote with the same value is idempotent (no-op).
 *
 * Validates the idempotent update behavior for comment votes. When a member updates a vote with the same value as the existing vote, the system must return the existing vote record unchanged without recalculating the comment's vote score or the comment author's karma.
 *
 * Special attention is given to verifying that the vote record identity, timestamps, and value match the original vote, proving that no server-side mutation occurred despite the PUT request.
 *
 * 1. Member A joins the platform as a new member.
 * 2. Member A creates a community with name, description, and icon image.
 * 3. Member A subscribes to the created community.
 * 4. Member A creates a text-type post in the community.
 * 5. Member B joins the platform with different credentials.
 * 6. Member B creates a top-level comment on Member A's post.
 * 7. Member A casts an upvote (+1) on Member B's comment.
 * 8. Member A updates the vote with the same value (+1) via the PUT endpoint.
 * 9. Validates the returned vote record is unchanged: id, created_at, updated_at, and value all match the original vote.
 */
export async function test_api_comment_vote_update_idempotent_same_value(
  connection: api.IConnection,
): Promise<void> {
  // ---- Actor-specific connections ----
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  // ---- Step 1: Member A joins ----
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // ---- Step 2: Member A creates a community ----
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // ---- Step 3: Member A subscribes to the community ----
  const subscription =
    await generate_random_community_platform_member_communities_subscribers_create(
      memberAConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(subscription);
  // ---- Step 4: Member A creates a text post ----
  const post = await generate_random_community_platform_member_posts_create(
    memberAConnection,
    {
      body: {
        communityId: community.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies DeepPartial<ICommunityPlatformPost.ICreate>,
    },
  );
  typia.assert(post);
  // ---- Step 5: Member B joins ----
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // ---- Step 6: Member B creates a comment on the post ----
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberBConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies DeepPartial<ICommunityPlatformComment.ICreate>,
      },
    );
  typia.assert(comment);
  // ---- Step 7: Member A casts an upvote (+1) on Member B's comment ----
  const vote =
    await generate_random_community_platform_member_posts_comments_votes_create(
      memberAConnection,
      {
        params: {
          postId: post.id,
          commentId: comment.id,
        },
        body: {
          value: 1,
        } satisfies DeepPartial<ICommunityPlatformCommentVote.ICreate>,
      },
    );
  typia.assert(vote);
  // Capture the original vote state for verification
  const originalVoteId: string = vote.id;
  const originalCreatedAt: string = vote.created_at;
  const originalUpdatedAt: string = vote.updated_at;
  const originalVoteValue: number = vote.value;
  // ---- Step 8: Member A updates the vote with the SAME value (+1) ----
  const updatedVote =
    await api.functional.communityPlatform.member.posts.comments.votes.update(
      memberAConnection,
      {
        postId: post.id,
        commentId: comment.id,
        voteId: originalVoteId,
        body: {
          value: 1,
        } satisfies ICommunityPlatformCommentVote.IUpdate,
      },
    );
  typia.assert(updatedVote);
  // ---- Step 9: Verification ----
  // The existing vote record is returned unchanged (no new record created)
  TestValidator.equals("vote id unchanged", updatedVote.id, originalVoteId);
  // The updated_at timestamp remains the same as the original vote creation
  TestValidator.equals(
    "updated_at unchanged",
    updatedVote.updated_at,
    originalUpdatedAt,
  );
  // The created_at timestamp remains the same
  TestValidator.equals(
    "created_at unchanged",
    updatedVote.created_at,
    originalCreatedAt,
  );
  // The vote value remains +1
  TestValidator.equals(
    "vote value unchanged",
    updatedVote.value,
    originalVoteValue,
  );
}
