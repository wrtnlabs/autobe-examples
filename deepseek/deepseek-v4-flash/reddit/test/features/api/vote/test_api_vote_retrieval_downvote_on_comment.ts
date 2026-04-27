import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
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
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_votes_create } from "../../../generate/generate_random_community_platform_member_votes_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";
import { prepare_random_community_platform_vote } from "../../../prepare/prepare_random_community_platform_vote";

/**
 * Test retrieving a downvote (-1) vote record that was cast on a comment.
 *
 * Validates the complete vote creation and retrieval workflow, ensuring that a downvote cast on a comment is correctly persisted and can be retrieved by its UUID. Verifies that the polymorphic target_type field correctly discriminates the comment target, that the downvote value (-1) is preserved, and that the voter identity matches the authenticated member.
 *
 * 1. Join as a new member via POST /auth/member/join to obtain JWT authentication tokens.
 * 2. Create a community via POST /member/communities with a unique name, description, and icon.
 * 3. Subscribe to the community via POST /member/communities/{communityId}/subscribers.
 * 4. Create a text-type post in the community via POST /member/posts.
 * 5. Create a top-level comment on the post via POST /member/posts/{postId}/comments.
 * 6. Cast a downvote (-1) on the comment via POST /member/votes with target_type='comment' and target_id set to the comment's ID.
 * 7. Retrieve the vote record via GET /member/votes/{voteId} using the vote's UUID from step 6.
 *
 * Validates that the retrieved vote has value -1, target_type 'comment', target_id matching the comment, and voter.id matching the authenticated member's ID.
 */
export async function test_api_vote_retrieval_downvote_on_comment(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection for authenticated operations
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // Subscribe the member to the community (required before posting)
  const subscription =
    await generate_random_community_platform_member_communities_subscribers_create(
      memberConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(subscription);
  // Create a text-type post in the community
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        type: "text",
      },
    },
  );
  typia.assert(post);
  // Create a top-level comment on the post
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // Cast a downvote (-1) on the comment
  const createdVote =
    await generate_random_community_platform_member_votes_create(
      memberConnection,
      {
        body: {
          target_type: "comment",
          target_id: comment.id,
          value: -1,
        },
      },
    );
  typia.assert(createdVote);
  // Retrieve the vote record by its UUID
  const retrievedVote = await api.functional.communityPlatform.member.votes.at(
    memberConnection,
    {
      voteId: createdVote.id,
    },
  );
  typia.assert(retrievedVote);
  // Validate the vote record correctness
  TestValidator.equals("vote id matches", retrievedVote.id, createdVote.id);
  TestValidator.equals("vote value is -1 (downvote)", retrievedVote.value, -1);
  TestValidator.equals(
    "target_type is comment",
    retrievedVote.target_type,
    "comment",
  );
  TestValidator.equals(
    "target_id matches comment id",
    retrievedVote.target_id,
    comment.id,
  );
  TestValidator.equals(
    "voter id matches authenticated member",
    retrievedVote.voter.id,
    authorized.id,
  );
}
