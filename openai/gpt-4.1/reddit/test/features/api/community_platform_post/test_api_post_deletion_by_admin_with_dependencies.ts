import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validate privileged admin post deletion (including cascade logic).
 *
 * Steps:
 *
 * 1. Register admin (join as admin)
 * 2. Create a community as admin (admin = initial member/creator/allowed by API)
 * 3. Admin creates a post in created community
 * 4. Delete the post (as admin)
 * 5. Verify deletion (future GET or action on post should fail)
 * 6. Try to delete same post again (should error)
 * 7. Try to delete random (nonexistent) post (should error)
 */
export async function test_api_post_deletion_by_admin_with_dependencies(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        superuser: true,
      },
    });
  typia.assert(admin);

  // 2. Create a community (as admin who is platform member & can be creator)
  const communityBody = {
    name: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 10 }),
    slug: RandomGenerator.alphaNumeric(10),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  // 3. Create a post as admin in the created community
  const postBody = {
    community_platform_community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 4 }),
    content_body: RandomGenerator.paragraph({ sentences: 20 }),
    content_type: "text" as const,
    status: "published",
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.admin.posts.create(
    connection,
    { body: postBody },
  );
  typia.assert(post);

  // 4. Delete the post as admin
  await api.functional.communityPlatform.admin.posts.erase(connection, {
    postId: post.id,
  });

  // 5. Attempting to delete again should throw error
  await TestValidator.error("delete again should error", async () => {
    await api.functional.communityPlatform.admin.posts.erase(connection, {
      postId: post.id,
    });
  });

  // 6. Attempting to delete a random (unrelated) post should error
  await TestValidator.error(
    "delete nonexistent post should error",
    async () => {
      await api.functional.communityPlatform.admin.posts.erase(connection, {
        postId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // Additional checks on deletion (verifying cascade and audit) would be made with further GET endpoints.
}
