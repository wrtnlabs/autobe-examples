import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSnapshot";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
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
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_comment_snapshot_mismatched_comment(
  connection: api.IConnection,
): Promise<void> {
  // Member A setup
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // Create community A
  const communityA =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(communityA);
  // Subscribe to community A
  const subscriptionA =
    await generate_random_community_platform_member_subscriptions_create(
      memberAConnection,
      { body: { community_id: communityA.id } },
    );
  typia.assert(subscriptionA);
  // Create post A
  const postA = await generate_random_community_platform_member_posts_create(
    memberAConnection,
    { body: { communityId: communityA.id } },
  );
  typia.assert(postA);
  // Create comment A
  const commentA =
    await generate_random_community_platform_member_posts_comments_create(
      memberAConnection,
      { params: { postId: postA.id } },
    );
  typia.assert(commentA);
  // Edit comment A to generate snapshot A
  const updatedCommentA =
    await api.functional.communityPlatform.member.posts.comments.update(
      memberAConnection,
      {
        postId: postA.id,
        commentId: commentA.id,
        body: { content: RandomGenerator.paragraph({ sentences: 3 }) },
      },
    );
  typia.assert(updatedCommentA);
  // Member B setup - different member
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // Create community B
  const communityB =
    await generate_random_community_platform_member_communities_create(
      memberBConnection,
      {},
    );
  typia.assert(communityB);
  // Subscribe to community B
  const subscriptionB =
    await generate_random_community_platform_member_subscriptions_create(
      memberBConnection,
      { body: { community_id: communityB.id } },
    );
  typia.assert(subscriptionB);
  // Create post B
  const postB = await generate_random_community_platform_member_posts_create(
    memberBConnection,
    { body: { communityId: communityB.id } },
  );
  typia.assert(postB);
  // Create comment B
  const commentB =
    await generate_random_community_platform_member_posts_comments_create(
      memberBConnection,
      { params: { postId: postB.id } },
    );
  typia.assert(commentB);
  // Edit comment B to generate snapshot B
  const updatedCommentB =
    await api.functional.communityPlatform.member.posts.comments.update(
      memberBConnection,
      {
        postId: postB.id,
        commentId: commentB.id,
        body: { content: RandomGenerator.paragraph({ sentences: 3 }) },
      },
    );
  typia.assert(updatedCommentB);
  // Test: Try to access a snapshot using comment A's ID with a random snapshot ID
  // This should return 404 because the snapshot doesn't belong to comment A
  // The test validates that the endpoint enforces the composite key relationship
  await TestValidator.httpError(
    "snapshot mismatched with comment should return 404",
    404,
    async () => {
      await api.functional.communityPlatform.comments.snapshots.at(
        memberAConnection,
        {
          commentId: commentA.id,
          snapshotId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
