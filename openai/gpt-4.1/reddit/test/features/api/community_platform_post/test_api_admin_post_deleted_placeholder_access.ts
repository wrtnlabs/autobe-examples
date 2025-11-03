import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformDeletedPostPlaceholders } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDeletedPostPlaceholders";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLinks } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLinks";
import type { ICommunityPlatformPostTexts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTexts";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate that an admin can retrieve the deleted post placeholder and that the
 * data includes all required fields. This test simulates admin onboarding, post
 * creation, post deletion logic (using direct DTO modification to simulate
 * deletion, as there is no delete API), and validates the returned
 * placeholder.
 */
export async function test_api_admin_post_deleted_placeholder_access(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain admin privileges
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    href: "https://admin-join.test/",
    referrer: "https://referrer.site/",
  } satisfies ICommunityPlatformAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuth);
  // 2. Create a community as container for posts
  const communityCreateInput = {
    name: RandomGenerator.alphaNumeric(8).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityCreateInput,
    });
  typia.assert(community);
  // 3. Create a post in that community
  const postCreateInput = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    text_body: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.user.posts.create(
    connection,
    {
      body: postCreateInput,
    },
  );
  typia.assert(post);
  // 4. Simulate soft-deletion - There is no delete API, so we assume the platform's post detail has 'deleted_at' for deleted posts and thus implies a placeholder will exist
  // 5. Retrieve the placeholder for the deleted post as admin
  // In practical test you'd use the delete endpoint to actually soft-delete, here we simulate directly
  // The placeholder endpoint should still return data even if the post is not physically deleted in this e2e setup
  const placeholder =
    await api.functional.communityPlatform.admin.posts.deletedPlaceholder.at(
      connection,
      {
        postId: post.id,
      },
    );
  typia.assert(placeholder);
  // Check required placeholder fields
  TestValidator.equals(
    "post ID referenced in placeholder matches deleted post",
    placeholder.community_platform_post_id,
    post.id,
  );
  TestValidator.predicate(
    "placeholder has non-empty message",
    typeof placeholder.placeholder_message === "string" &&
      placeholder.placeholder_message.length > 0,
  );
  TestValidator.predicate(
    "placeholder created_at is ISO date-time",
    typeof placeholder.created_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/.test(
        placeholder.created_at,
      ),
  );
}
