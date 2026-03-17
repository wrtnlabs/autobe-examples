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
 * Test that retrieving a soft-deleted or non-existent post returns 404 NOT_FOUND.
 *
 * Per operation specification: The post must exist and not be soft-deleted;
 * otherwise, a 404 error is returned. The deleted_at field tracks soft-deletion.
 */
export async function test_api_post_not_found_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create member, community, and post
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(post);
  // Verify post can be retrieved before deletion (base case)
  const existingPost = await api.functional.communityPlatform.posts.at(
    memberConnection,
    { postId: post.id },
  );
  typia.assert(existingPost);
  // Delete the post
  await api.functional.communityPlatform.member.posts.erase(memberConnection, {
    postId: post.id,
  });
  // Verify deleted post returns 404 NOT_FOUND
  await TestValidator.httpError("deleted post should return 404", 404, () =>
    api.functional.communityPlatform.posts.at(memberConnection, {
      postId: post.id,
    }),
  );
  // Verify non-existent post returns 404 NOT_FOUND
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent post should return 404",
    404,
    () =>
      api.functional.communityPlatform.posts.at(memberConnection, {
        postId: nonExistentId,
      }),
  );
}
