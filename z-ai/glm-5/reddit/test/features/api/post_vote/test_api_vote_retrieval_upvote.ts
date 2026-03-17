import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
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
import { generate_random_community_platform_member_posts_vote_create } from "../../../generate/generate_random_community_platform_member_posts_vote_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

/**
 * Test retrieving an upvote record that the authenticated member has previously cast on a post.
 *
 * Setup Steps:
 * 1. Authenticate as a member (member A)
 * 2. Create a community (member A becomes owner)
 * 3. Create a text post in that community
 * 4. Cast an upvote on the post as member A
 *
 * Test Execution:
 * Call GET /communityPlatform/member/posts/{postId}/vote with the postId of the created post.
 *
 * Validations:
 * - Response returns ICommunityPlatformPostVote entity
 * - Vote record contains targetType: 'post'
 * - Vote record contains targetId matching the postId
 * - Vote record contains voteType: 'upvote'
 * - Vote record includes member summary with correct member details
 * - Vote record includes createdAt timestamp (non-null)
 * - Vote record includes updatedAt timestamp (non-null)
 */
export async function test_api_vote_retrieval_upvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community (member becomes owner)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a text post in that community
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberConnection,
      {
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(post);
  // 4. Cast an upvote on the post
  const createdVote =
    await generate_random_community_platform_member_posts_vote_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          targetType: "post",
          targetId: post.id,
          voteType: "upvote",
        },
      },
    );
  typia.assert(createdVote);
  // 5. Retrieve the vote record
  const retrievedVote =
    await api.functional.communityPlatform.member.posts.vote.at(
      memberConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(retrievedVote);
  // 6. Validate the vote record
  TestValidator.equals(
    "targetType should be post",
    retrievedVote.targetType,
    "post",
  );
  TestValidator.equals(
    "targetId should match postId",
    retrievedVote.targetId,
    post.id,
  );
  TestValidator.equals(
    "voteType should be upvote",
    retrievedVote.voteType,
    "upvote",
  );
  TestValidator.equals(
    "member id should match",
    retrievedVote.member.id,
    member.id,
  );
  TestValidator.predicate(
    "createdAt should exist",
    retrievedVote.createdAt !== null,
  );
  TestValidator.predicate(
    "updatedAt should exist",
    retrievedVote.updatedAt !== null,
  );
}
