import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_vote_post_downvote_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A (author) joins
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {});
  // 2. Member A creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {},
    );
  // 3. Member A subscribes to the community
  await generate_random_community_platform_member_subscriptions_create(
    authorConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  // 4. Member A creates a post in the community
  const post = await generate_random_community_platform_member_posts_create(
    authorConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        contentType: "text",
        textContent: RandomGenerator.content({ paragraphs: 2 }),
        linkUrl: null,
        imageUrl: null,
      },
    },
  );
  // 5. Member B (voter) joins
  const voterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(voterConnection, {});
  // 6. Member B subscribes to the community
  await generate_random_community_platform_member_subscriptions_create(
    voterConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  // 7. Member B casts a downvote on the post
  const downvote =
    await api.functional.communityPlatform.member.posts.vote.cast(
      voterConnection,
      {
        postId: post.id,
        body: {
          voteType: "downvote",
        } satisfies ICommunityPlatformVote.IRequest,
      },
    );
  typia.assert(downvote);
  // Test: Retrieve the downvote state
  const retrievedVote =
    await api.functional.communityPlatform.member.posts.vote.at(
      voterConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(retrievedVote);
  // Validate the retrieved downvote state
  TestValidator.equals(
    "vote type is downvote",
    retrievedVote.voteType,
    "downvote",
  );
  TestValidator.equals("vote id matches", retrievedVote.id, downvote.id);
  TestValidator.predicate(
    "has valid created_at timestamp",
    retrievedVote.createdAt.length > 0,
  );
  TestValidator.predicate(
    "has valid updated_at timestamp",
    retrievedVote.updatedAt.length > 0,
  );
}
