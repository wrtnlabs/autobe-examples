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
import { generate_random_community_platform_member_votes_create } from "../../../generate/generate_random_community_platform_member_votes_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_vote_post_change_upvote_to_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create author account and authenticate
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  typia.assert(author);
  // 2. Create a community (author becomes owner)
  const community =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a text post in the community
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      authorConnection,
      {
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(post);
  // 4. Create voter account and authenticate
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {});
  typia.assert(voter);
  // 5. Voter casts an upvote on the post
  const upvote = await generate_random_community_platform_member_votes_create(
    voterConnection,
    {
      body: {
        targetType: "post",
        targetId: post.id,
        voteType: "upvote",
      },
    },
  );
  typia.assert(upvote);
  // Record the original updatedAt timestamp
  const originalUpdatedAt = upvote.updatedAt;
  // 6. Change vote from upvote to downvote
  const updatedVote =
    await api.functional.communityPlatform.member.votes.update(
      voterConnection,
      {
        voteId: upvote.id,
        body: {
          vote_type: "downvote",
          target_type: "post",
        } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  typia.assert(updatedVote);
  // 7. Verify the vote was updated correctly
  TestValidator.equals(
    "vote type changed to downvote",
    updatedVote.voteType,
    "downvote",
  );
  TestValidator.equals("target type unchanged", updatedVote.targetType, "post");
  TestValidator.equals("target ID unchanged", updatedVote.targetId, post.id);
  TestValidator.notEquals(
    "updatedAt timestamp modified",
    updatedVote.updatedAt,
    originalUpdatedAt,
  );
}
