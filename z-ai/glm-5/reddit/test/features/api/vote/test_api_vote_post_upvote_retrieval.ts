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

/**
 * Test retrieving a member's upvote state on a post.
 *
 * This test validates that a member can retrieve their vote state
 * after casting an upvote on a post. The workflow involves:
 * 1. Member A creates a community and a post
 * 2. Member B subscribes to the community
 * 3. Member B casts an upvote
 * 4. Member B retrieves their vote state
 * 5. Validate the vote type is 'upvote' and timestamps are correct
 */
export async function test_api_vote_post_upvote_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup Member A (post author)
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authorConnection, {});
  // 2. Create community as Member A
  const community =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe Member A to the community
  const authorSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      authorConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(authorSubscription);
  // 4. Create post as Member A
  const post = await generate_random_community_platform_member_posts_create(
    authorConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.name(),
        contentType: "text",
        textContent: RandomGenerator.paragraph({ sentences: 5 }),
        linkUrl: null,
        imageUrl: null,
      },
    },
  );
  typia.assert(post);
  // 5. Setup Member B (voter)
  const voterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(voterConnection, {});
  // 6. Subscribe Member B to the community
  const voterSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      voterConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(voterSubscription);
  // 7. Member B casts an upvote on the post
  const castVote =
    await api.functional.communityPlatform.member.posts.vote.cast(
      voterConnection,
      {
        postId: post.id,
        body: {
          voteType: "upvote",
        },
      },
    );
  typia.assert(castVote);
  // 8. Member B retrieves their vote state
  const retrievedVote =
    await api.functional.communityPlatform.member.posts.vote.at(
      voterConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(retrievedVote);
  // 9. Validate the vote state
  TestValidator.equals(
    "vote type should be upvote",
    retrievedVote.voteType,
    "upvote",
  );
  TestValidator.equals(
    "vote id should match cast vote",
    retrievedVote.id,
    castVote.id,
  );
  TestValidator.equals(
    "created at should match",
    retrievedVote.createdAt,
    castVote.createdAt,
  );
  TestValidator.equals(
    "updated at should match",
    retrievedVote.updatedAt,
    castVote.updatedAt,
  );
}
