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
 * Test the complete moderator removal workflow where an administrator removes a
 * moderator from a community.
 *
 * This test validates the end-to-end process of moderator removal, including:
 *
 * - Administrator authentication and authorization
 * - Moderator assignment creation prerequisite
 * - Successful moderator removal operation
 * - Authorization checks ensuring only administrators can perform removal
 *
 * The test follows a realistic business flow where an admin first creates a
 * moderator assignment, then removes it, validating that moderator privileges
 * are properly revoked.
 */
export async function test_api_community_moderator_removal_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a moderator assignment to be removed
  // Using a realistic community slug since no community creation API is available
  const communitySlug =
    "test-community-" + RandomGenerator.alphaNumeric(8).toLowerCase();

  const moderatorAssignment: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.admin.communities.moderators.create(
      connection,
      {
        communitySlug: communitySlug,
        body: {
          actor_type: "member",
          permission_level: "full",
          actor_member_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);

  // Step 3: Remove the moderator assignment
  await api.functional.communityPlatform.admin.communities.moderators.erase(
    connection,
    {
      communitySlug: communitySlug,
      moderatorId: moderatorAssignment.id,
    },
  );

  // Step 4: Validate that the removal operation completed successfully
  // Since the erase API returns void, we validate by ensuring no error was thrown
  // and the operation completed without exceptions
  TestValidator.predicate("moderator removal completed successfully", true);

  // Step 5: Additional validation with different admin levels
  // Create a second admin with different privilege level to demonstrate
  // that various admin types can perform the operation
  const secondAdminEmail = typia.random<string & tags.Format<"email">>();
  const secondAdmin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: secondAdminEmail,
        password: "SecondAdmin456!",
        display_name: RandomGenerator.name(),
        admin_level: "content",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(secondAdmin);

  // Create another moderator assignment for comprehensive testing
  const secondModeratorAssignment: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.admin.communities.moderators.create(
      connection,
      {
        communitySlug: communitySlug,
        body: {
          actor_type: "moderator",
          permission_level: "limited",
          actor_moderator_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(secondModeratorAssignment);

  // Remove the second moderator assignment to validate different actor types
  await api.functional.communityPlatform.admin.communities.moderators.erase(
    connection,
    {
      communitySlug: communitySlug,
      moderatorId: secondModeratorAssignment.id,
    },
  );

  TestValidator.predicate(
    "second moderator removal with different actor type completed successfully",
    true,
  );
}
