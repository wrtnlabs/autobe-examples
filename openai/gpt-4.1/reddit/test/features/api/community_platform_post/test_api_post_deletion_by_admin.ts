import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLinks } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLinks";
import type { ICommunityPlatformPostTexts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTexts";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validates that an authenticated admin can delete any user's post and that
 * deletion is properly cascaded.
 *
 * 1. Register and login as an admin.
 * 2. Register and login as a normal user.
 * 3. User creates a community.
 * 4. User creates a post (text type) in the community.
 * 5. Admin deletes the post via the admin endpoint.
 * 6. Attempt to delete again (should fail).
 * 7. Attempt to delete as an unrelated user (should fail).
 */
export async function test_api_post_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and login as a new admin.
  const adminOutput: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(2),
        href: "https://admin-join.com/",
        referrer: "https://platform.com/landing",
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(adminOutput);

  // 2. Register and login as a normal user.
  const userOutput: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(2),
        href: "https://user-join.com/",
        referrer: "https://platform.com/landing",
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(userOutput);

  // 3. As user, create a new community
  const communityOutput: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: RandomGenerator.alphaNumeric(8).toLowerCase(),
        description: RandomGenerator.paragraph({ sentences: 10 }),
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(communityOutput);

  // 4. As user, create a post in the community (text post)
  const postOutput: ICommunityPlatformPost =
    await api.functional.communityPlatform.user.posts.create(connection, {
      body: {
        community_id: communityOutput.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        text_body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 10,
          sentenceMax: 25,
        }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(postOutput);

  // 5. As admin, delete the user's post using the admin endpoint
  await api.functional.communityPlatform.admin.posts.erase(connection, {
    postId: postOutput.id,
  });

  // 6. Attempting to delete again as admin should fail
  await TestValidator.error(
    "deleting already-deleted post as admin should fail",
    async () => {
      await api.functional.communityPlatform.admin.posts.erase(connection, {
        postId: postOutput.id,
      });
    },
  );

  // 7. Register/login as a new unrelated user and try to delete post as that user (should fail)
  const otherUserOutput: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(2),
        href: "https://other-user-join.com/",
        referrer: "https://platform.com/landing",
      } satisfies ICommunityPlatformUser.IJoin,
    });
  typia.assert(otherUserOutput);

  await TestValidator.error(
    "normal users cannot delete posts via admin API",
    async () => {
      await api.functional.communityPlatform.admin.posts.erase(connection, {
        postId: postOutput.id,
      });
    },
  );
}
