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
 * Test scenario where a member successfully deletes their own post.
 *
 * This test validates that:
 * 1. A member can delete their own post
 * 2. The deletion is successful (returns void/204)
 * 3. The deleted post is no longer accessible (404 on subsequent access)
 */
export async function test_api_post_deletion_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate the member who will own the post
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community owned by the member
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a post in the community by the same member
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(post);
  // 4. Delete the post by the author (should succeed)
  await api.functional.communityPlatform.member.communities.posts.erase(
    memberConnection,
    {
      communityId: community.id,
      postId: post.id,
    },
  );
  // 5. Verify the post was deleted - attempting to delete again should fail with 404
  await TestValidator.error(
    "deleted post should not be accessible",
    async () => {
      await api.functional.communityPlatform.member.communities.posts.erase(
        memberConnection,
        {
          communityId: community.id,
          postId: post.id,
        },
      );
    },
  );
}
