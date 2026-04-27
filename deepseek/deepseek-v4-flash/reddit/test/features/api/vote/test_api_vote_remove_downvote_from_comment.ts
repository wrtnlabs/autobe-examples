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

export async function test_api_vote_remove_downvote_from_comment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as member A (voter/community creator)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  // 2. Join as member B (comment author)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  // 3. Member A creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 4. Member A subscribes to the community
  await generate_random_community_platform_member_communities_subscribers_create(
    memberAConnection,
    {
      body: {},
      params: { communityId: community.id },
    },
  );
  // 5. Member B subscribes to the community
  await generate_random_community_platform_member_communities_subscribers_create(
    memberBConnection,
    {
      body: {},
      params: { communityId: community.id },
    },
  );
  // 6. Member B creates a text post in the community
  const post = await generate_random_community_platform_member_posts_create(
    memberBConnection,
    {
      body: {
        communityId: community.id,
        type: "text" as const,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(post);
  // 7. Member B writes a comment on the post
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberBConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(comment);
  // Validate initial comment state
  TestValidator.equals("initial comment vote score", comment.voteScore, 0);
  // 8. Member A casts a downvote (-1) on member B's comment
  const vote = await generate_random_community_platform_member_votes_create(
    memberAConnection,
    {
      body: {
        target_type: "comment",
        target_id: comment.id,
        value: -1,
      },
    },
  );
  typia.assert(vote);
  // Validate vote record
  TestValidator.equals("vote value is downvote", vote.value, -1);
  TestValidator.equals("vote targets comment", vote.target_type, "comment");
  TestValidator.equals(
    "vote target id matches comment",
    vote.target_id,
    comment.id,
  );
  // 9. Member A removes the downvote via DELETE
  await api.functional.communityPlatform.member.votes.erase(memberAConnection, {
    voteId: vote.id,
  });
  // 10. Member A can cast a fresh vote on the same comment (confirming hard delete)
  const freshVote =
    await generate_random_community_platform_member_votes_create(
      memberAConnection,
      {
        body: {
          target_type: "comment",
          target_id: comment.id,
          value: -1,
        },
      },
    );
  typia.assert(freshVote);
  TestValidator.notEquals("new vote has different id", freshVote.id, vote.id);
}
