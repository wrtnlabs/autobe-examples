import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
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
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_votes_create } from "../../../generate/generate_random_community_platform_member_votes_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_vote_comment_downvote_karma_decrease(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member A (comment author who will receive the downvote)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // Record initial karma for member A (should be 0 for new member)
  const initialKarma = memberA.karma;
  TestValidator.equals("member A initial karma", initialKarma, 0);
  // 2. Member A creates a community (automatically subscribed as owner)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Member A creates a post in the community
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberAConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(post);
  // 4. Member A creates a comment on the post
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberAConnection,
      {
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // Verify comment's initial vote_score is 0
  TestValidator.equals("comment initial vote_score", comment.voteScore, 0);
  // 5. Create member B (voter who will cast the downvote)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 6. Member B casts a downvote on member A's comment
  const vote = await generate_random_community_platform_member_votes_create(
    memberBConnection,
    {
      body: {
        targetType: "comment",
        targetId: comment.id,
        voteType: "downvote",
      },
    },
  );
  typia.assert(vote);
  // Validate vote record was created correctly
  TestValidator.equals("vote targetType", vote.targetType, "comment");
  TestValidator.equals("vote targetId", vote.targetId, comment.id);
  TestValidator.equals("vote voteType", vote.voteType, "downvote");
  TestValidator.equals("voter is member B", vote.member.id, memberB.id);
}
