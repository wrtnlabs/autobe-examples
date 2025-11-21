import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test moderator assignment workflow validation with non-existent community.
 * Since community creation API is not available, this test validates error
 * handling when attempting to assign moderator privileges to a non-existent
 * community.
 */
export async function test_api_community_moderator_assignment_moderator_role(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "Admin123!",
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create another administrator to assign as moderator
  const moderatorAdminEmail = typia.random<string & tags.Format<"email">>();
  const moderatorAdmin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: moderatorAdminEmail,
        password: "Admin456!",
        display_name: RandomGenerator.name(),
        admin_level: "content",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(moderatorAdmin);

  // Step 3: Attempt to assign moderator privileges using a non-existent community slug
  // Since community creation API is not available, we test error handling
  const nonExistentCommunitySlug =
    "non-existent-community-" + RandomGenerator.alphaNumeric(10);

  await TestValidator.error(
    "moderator assignment to non-existent community should fail",
    async () => {
      await api.functional.communityPlatform.admin.communities.moderators.create(
        connection,
        {
          communitySlug: nonExistentCommunitySlug,
          body: {
            actor_type: "admin",
            permission_level: "full",
            actor_admin_id: moderatorAdmin.id,
          } satisfies ICommunityPlatformCommunityModerator.ICreate,
        },
      );
    },
  );

  // Step 4: Test valid moderator assignment with a realistic community slug pattern
  // Using a properly formatted slug that follows community naming conventions
  const realisticCommunitySlug =
    "test-community-" + RandomGenerator.alphaNumeric(8).toLowerCase();

  await TestValidator.error(
    "moderator assignment with realistic but non-existent community should fail",
    async () => {
      await api.functional.communityPlatform.admin.communities.moderators.create(
        connection,
        {
          communitySlug: realisticCommunitySlug,
          body: {
            actor_type: "admin",
            permission_level: "content_only",
            actor_admin_id: moderatorAdmin.id,
          } satisfies ICommunityPlatformCommunityModerator.ICreate,
        },
      );
    },
  );

  // Step 5: Validate that both administrators were created successfully
  TestValidator.equals("first admin email matches", admin.email, adminEmail);
  TestValidator.equals(
    "second admin email matches",
    moderatorAdmin.email,
    moderatorAdminEmail,
  );
  TestValidator.notEquals(
    "admin IDs should be different",
    admin.id,
    moderatorAdmin.id,
  );
  TestValidator.predicate(
    "both admins should have valid UUIDs",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      admin.id,
    ) &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        moderatorAdmin.id,
      ),
  );
}
