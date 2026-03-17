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

export async function test_api_vote_downvote_removal_comment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member A (content author)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Create a community (member A becomes owner, auto-subscribed)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a post authored by member A
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberAConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(post);
  // 4. Create a comment authored by member A
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberAConnection,
      {
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // 5. Create member B (voter)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 6. Cast a downvote on member A's comment as member B
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
  // 7. Verify vote was created with correct properties
  TestValidator.equals("vote targetType", vote.targetType, "comment");
  TestValidator.equals("vote voteType", vote.voteType, "downvote");
  TestValidator.equals("vote targetId", vote.targetId, comment.id);
  // 8. Remove the downvote
  await api.functional.communityPlatform.member.votes.erase(memberBConnection, {
    voteId: vote.id,
  });
  // 9. Verify deletion by attempting to vote again (should succeed since vote was removed)
  // One-vote-per-user-per-item constraint means voting again proves deletion worked
  const newVote = await generate_random_community_platform_member_votes_create(
    memberBConnection,
    {
      body: {
        targetType: "comment",
        targetId: comment.id,
        voteType: "upvote",
      },
    },
  );
  typia.assert(newVote);
  // 10. Verify new vote was created (proves downvote was successfully removed)
  TestValidator.equals("new vote targetType", newVote.targetType, "comment");
  TestValidator.equals("new vote voteType", newVote.voteType, "upvote");
  TestValidator.notEquals(
    "new vote is different from removed vote",
    newVote.id,
    vote.id,
  );
}
