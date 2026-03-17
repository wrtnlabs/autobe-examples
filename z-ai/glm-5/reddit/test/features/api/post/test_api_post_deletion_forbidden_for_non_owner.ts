import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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

/**
 * Test that a non-owner, non-moderator member cannot delete another member's post.
 *
 * Setup:
 * 1. Register Member A (post author and community owner)
 * 2. Member A creates a community
 * 3. Member A creates a post in that community
 * 4. Register Member B (regular member with no moderation rights)
 *
 * Test:
 * 1. Member B attempts to delete Member A's post
 * 2. Verify 403 Forbidden error is returned
 *
 * This validates the authorization rule: only post authors or community
 * moderators/owners can delete posts.
 */
export async function test_api_post_deletion_forbidden_for_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate Member A (post author and community owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // 2. Member A creates a community (automatically becomes owner)
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
  // 4. Register and authenticate Member B (different member with no moderation role)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 5. Member B attempts to delete Member A's post - should fail with 403
  await TestValidator.httpError(
    "non-owner cannot delete another member's post",
    403,
    async () => {
      await api.functional.communityPlatform.member.posts.erase(
        memberBConnection,
        { postId: post.id },
      );
    },
  );
}
