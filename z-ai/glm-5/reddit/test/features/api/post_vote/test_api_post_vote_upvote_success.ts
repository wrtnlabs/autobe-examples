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

export async function test_api_post_vote_upvote_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup member A (voter) with isolated connection
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Member A creates a community (becomes owner, likely auto-subscribed)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Setup member B (post author) with isolated connection
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 4. Member B creates a text post in the community
  // Note: If subscription is required, member B would need to subscribe first
  // For now, attempting post creation directly
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberBConnection,
      {
        params: { communityId: community.id },
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          postType: "text",
          content: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    );
  typia.assert(post);
  // 5. Member A casts an upvote on member B's post
  const vote =
    await generate_random_community_platform_member_posts_vote_create(
      memberAConnection,
      {
        params: { postId: post.id },
        body: {
          targetType: "post",
          targetId: post.id,
          voteType: "upvote",
        },
      },
    );
  typia.assert(vote);
  // 6. Validate vote properties
  TestValidator.equals("targetType should be post", vote.targetType, "post");
  TestValidator.equals("targetId should match post ID", vote.targetId, post.id);
  TestValidator.equals("voteType should be upvote", vote.voteType, "upvote");
  TestValidator.equals(
    "voter ID should match member A",
    vote.member.id,
    memberA.id,
  );
  TestValidator.predicate(
    "vote ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      vote.id,
    ),
  );
}
