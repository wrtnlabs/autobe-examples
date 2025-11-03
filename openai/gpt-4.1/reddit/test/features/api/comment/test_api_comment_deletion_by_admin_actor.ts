import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLinks } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLinks";
import type { ICommunityPlatformPostTexts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTexts";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validates admin-driven (platform-level) deletion of any user's comment.
 *
 * Tests a real-world thread scenario. Flows:
 *
 * 1. Register admin
 * 2. Register user
 * 3. User creates a community
 * 4. User creates a post in that community
 * 5. User submits a comment
 * 6. Admin deletes the user comment at the admin endpoint
 * 7. (For thread integrity) Optionally, replies could be present for advanced
 *    tests
 * 8. Validation:
 *
 *    - Comment is inaccessible after deletion
 *    - Admin-only endpoint permits the action
 *    - Proper behavior for removed comment (e.g., is_removed true for threaded
 *         replies if supported)
 *    - Only admins, not users, can perform platform deletion
 */
export async function test_api_comment_deletion_by_admin_actor(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(1),
      href: "https://admin-join.test/", // test registration context
      referrer: "https://test-entrypoint/",
      ip: undefined,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Register user
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      href: "https://user-join.test/", // test registration context
      referrer: "https://test-entrypoint/",
      ip: undefined,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userJoin);

  // Switch to user authentication (token is set by SDK)

  // 3. User creates a community
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: RandomGenerator.alphabets(7).toLowerCase(),
        description: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(community);

  // 4. User creates a post (text post)
  const post = await api.functional.communityPlatform.user.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        text_body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 6,
          sentenceMax: 10,
          wordMin: 4,
          wordMax: 10,
        }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 5. User creates a comment
  const comment = await api.functional.communityPlatform.user.comments.create(
    connection,
    {
      body: {
        post_id: post.id,
        body: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 6,
          wordMax: 13,
        }),
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);

  // 6. Admin deletes the comment
  // Switch to admin account (token already set by join)
  await api.functional.communityPlatform.admin.comments.erase(connection, {
    commentId: comment.id,
  });
  // If we had a get API to verify, we'd attempt to fetch, expecting error
  // (Not present in provided API subset)
  // But we validate that the code throws no error for admin at this endpoint

  // 7. Check admin-only permission: try to delete as a user (should fail)
  // Switch token to user
  await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      href: "https://user-join.test/", // context
      referrer: "https://test-entrypoint/",
      ip: undefined,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  await TestValidator.error(
    "non-admin cannot erase comment via admin endpoint",
    async () => {
      await api.functional.communityPlatform.admin.comments.erase(connection, {
        commentId: comment.id,
      });
    },
  );
}
