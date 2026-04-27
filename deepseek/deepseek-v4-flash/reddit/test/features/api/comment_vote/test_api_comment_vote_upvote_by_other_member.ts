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
 * Test that an authenticated member can upvote another member's comment on a post.
 *
 * Validates the complete upvote flow including Member A creating a community, post, and comment, then Member B casting an upvote on that comment. Ensures the vote record correctly captures the voter identity, vote direction, and referenced comment, and that the comment's denormalized vote score is incremented by the expected amount.
 *
 * 1. Member A joins the platform, creates a community, subscribes to it, creates a text post, and creates a top-level comment.
 * 2. Member B joins the platform as a separate member.
 * 3. Member B calls the comment vote endpoint with value=+1 (upvote).
 * 4. Validates that the returned vote record has value=+1, voter references Member B, and the comment matches the target.
 * 5. Validates that the comment's vote_score in the vote response equals the initial voteScore + 1.
 */
export async function test_api_comment_vote_upvote_by_other_member(
  connection: api.IConnection,
): Promise<void> {
  // ---- Step 1: Member A Setup ----
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  // ---- Step 2: Community Creation ----
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  // ---- Step 3: Subscribe Member A to the community ----
  await generate_random_community_platform_member_communities_subscribers_create(
    memberAConnection,
    {
      params: { communityId: community.id },
    },
  );
  // ---- Step 4: Create a text post ----
  const post = await generate_random_community_platform_member_posts_create(
    memberAConnection,
    {
      body: {
        communityId: community.id,
        type: "text" as const,
        body: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  // ---- Step 5: Create a top-level comment ----
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberAConnection,
      {
        params: { postId: post.id },
      },
    );
  const initialVoteScore: number = comment.voteScore;
  // ---- Step 6: Member B Setup ----
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  // ---- Step 7: Member B upvotes the comment ----
  const vote =
    await generate_random_community_platform_member_posts_comments_votes_create(
      memberBConnection,
      {
        body: { value: 1 },
        params: {
          postId: post.id,
          commentId: comment.id,
        },
      },
    );
  // ---- Step 8: Validations ----
  typia.assert(vote);
  // (1) Vote value must be +1
  TestValidator.equals("vote value", vote.value, 1);
  // (2) Voter must be Member B
  TestValidator.equals("vote voter id", vote.voter.id, memberB.id);
  // (3) Vote references the correct comment
  TestValidator.equals("vote comment id", vote.comment.id, comment.id);
  // (4) Comment vote_score is incremented by 1
  TestValidator.equals(
    "comment vote score incremented",
    vote.comment.vote_score,
    initialVoteScore + 1,
  );
}
