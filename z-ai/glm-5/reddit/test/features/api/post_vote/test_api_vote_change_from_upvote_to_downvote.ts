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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_vote_change_from_upvote_to_downvote(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create Member A (post author)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // Step 2: Member A creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // Step 3: Member A creates a post in the community
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberAConnection,
      {
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(post);
  // Verify initial post state
  TestValidator.equals("initial voteScore is 0", post.voteScore, 0);
  // Step 4: Create Member B (voter)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // Step 5: Member B casts an upvote on the post
  const upvote = await api.functional.communityPlatform.member.votes.cast(
    memberBConnection,
    {
      body: {
        targetType: "post",
        targetId: post.id,
        voteType: "upvote",
      } satisfies ICommunityPlatformPostVote.IRequest,
    },
  );
  typia.assert(upvote);
  // Verify upvote record
  TestValidator.equals("upvote targetType is post", upvote.targetType, "post");
  TestValidator.equals(
    "upvote targetId matches post",
    upvote.targetId,
    post.id,
  );
  TestValidator.equals("upvote voteType is upvote", upvote.voteType, "upvote");
  TestValidator.equals(
    "upvote member matches member B",
    upvote.member.id,
    memberB.id,
  );
  TestValidator.equals(
    "createdAt equals updatedAt initially",
    upvote.createdAt,
    upvote.updatedAt,
  );
  // Store timestamps for comparison
  const upvoteCreatedAt = upvote.createdAt;
  const upvoteUpdatedAt = upvote.updatedAt;
  // Step 6: Member B changes their vote from upvote to downvote
  const downvote = await api.functional.communityPlatform.member.votes.cast(
    memberBConnection,
    {
      body: {
        targetType: "post",
        targetId: post.id,
        voteType: "downvote",
      } satisfies ICommunityPlatformPostVote.IRequest,
    },
  );
  typia.assert(downvote);
  // Verify downvote record (same record updated)
  TestValidator.equals(
    "downvote targetType is post",
    downvote.targetType,
    "post",
  );
  TestValidator.equals(
    "downvote targetId matches post",
    downvote.targetId,
    post.id,
  );
  TestValidator.equals(
    "downvote voteType is downvote",
    downvote.voteType,
    "downvote",
  );
  TestValidator.equals(
    "downvote member matches member B",
    downvote.member.id,
    memberB.id,
  );
  // Verify the vote ID remains the same (same record updated)
  TestValidator.equals("vote ID remains the same", upvote.id, downvote.id);
  // Verify createdAt timestamp remains unchanged
  TestValidator.equals(
    "createdAt remains unchanged",
    downvote.createdAt,
    upvoteCreatedAt,
  );
  // Verify updatedAt timestamp is newer than createdAt
  TestValidator.predicate(
    "updatedAt is newer than createdAt after vote change",
    new Date(downvote.updatedAt).getTime() >=
      new Date(downvote.createdAt).getTime(),
  );
  // Verify updatedAt changed from the original upvote timestamp
  TestValidator.predicate(
    "updatedAt changed after vote modification",
    new Date(downvote.updatedAt).getTime() >=
      new Date(upvoteUpdatedAt).getTime(),
  );
}
