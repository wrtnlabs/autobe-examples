import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

/**
 * Test the business rule that prevents updating posts that have been soft-deleted.
 *
 * This test validates that:
 * 1. A member can create a community and post
 * 2. The post can be soft-deleted by the author
 * 3. Attempting to update a deleted post returns an error (404/410)
 * 4. The system properly rejects modifications to soft-deleted content
 */
export async function test_api_post_update_deleted_post_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {});
  typia.assert(authResult);
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a text post in the community
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        contentType: "text",
        textContent: RandomGenerator.paragraph({ sentences: 3 }),
        title: RandomGenerator.paragraph({ sentences: 1 }),
        linkUrl: null,
        imageUrl: null,
      },
    },
  );
  typia.assert(post);
  // 4. Soft-delete the post
  await api.functional.communityPlatform.member.posts.erase(memberConnection, {
    postId: post.id,
  });
  // 5. Attempt to update the deleted post - should fail with HTTP error
  await TestValidator.httpError(
    "should reject update on deleted post",
    [404, 410],
    async () => {
      await api.functional.communityPlatform.member.posts.update(
        memberConnection,
        {
          postId: post.id,
          body: {
            title: "Updated title",
            text_content: "Updated content",
          } satisfies ICommunityPlatformPost.IUpdate,
        },
      );
    },
  );
}
