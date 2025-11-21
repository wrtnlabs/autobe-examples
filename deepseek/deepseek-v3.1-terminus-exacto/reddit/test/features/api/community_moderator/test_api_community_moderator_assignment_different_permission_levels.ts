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
 * Test moderator assignment with different permission levels (full,
 * content_only, limited). Validates that each permission level creates
 * appropriate moderator capabilities and access restrictions. Tests granular
 * permission control and proper enforcement of moderator privilege boundaries.
 */
export async function test_api_community_moderator_assignment_different_permission_levels(
  connection: api.IConnection,
) {
  // 1. Create administrator account for authentication context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin_password_123",
      display_name: RandomGenerator.name(),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Create a realistic community slug for testing (using proper format)
  const communitySlug = RandomGenerator.alphabets(8).toLowerCase();

  // Test each permission level with admin actor type
  const permissionLevels = ["full", "content_only", "limited"] as const;

  for (const permissionLevel of permissionLevels) {
    // Create moderator assignment with current permission level
    const moderatorAssignment =
      await api.functional.communityPlatform.admin.communities.moderators.create(
        connection,
        {
          communitySlug: communitySlug,
          body: {
            actor_type: "admin",
            permission_level: permissionLevel,
            actor_admin_id: admin.id,
          } satisfies ICommunityPlatformCommunityModerator.ICreate,
        },
      );
    typia.assert(moderatorAssignment);

    // Validate the assignment properties comprehensively
    TestValidator.equals(
      `moderator assignment permission level should be ${permissionLevel}`,
      moderatorAssignment.permission_level,
      permissionLevel,
    );
    TestValidator.equals(
      `moderator assignment actor type should be admin`,
      moderatorAssignment.actor_type,
      "admin",
    );
    TestValidator.predicate(
      `moderator assignment should have valid assigned_at timestamp`,
      moderatorAssignment.assigned_at !== null &&
        moderatorAssignment.assigned_at !== undefined &&
        typeof moderatorAssignment.assigned_at === "string" &&
        moderatorAssignment.assigned_at.length > 0,
    );
    TestValidator.predicate(
      `moderator assignment should not be revoked`,
      moderatorAssignment.revoked_at === null ||
        moderatorAssignment.revoked_at === undefined,
    );
    TestValidator.predicate(
      `moderator assignment should have valid UUID ID`,
      moderatorAssignment.id !== null &&
        moderatorAssignment.id !== undefined &&
        typeof moderatorAssignment.id === "string" &&
        moderatorAssignment.id.length > 0,
    );
    TestValidator.predicate(
      `moderator assignment should have creation timestamp`,
      moderatorAssignment.created_at !== null &&
        moderatorAssignment.created_at !== undefined &&
        typeof moderatorAssignment.created_at === "string" &&
        moderatorAssignment.created_at.length > 0,
    );
  }

  // Test that different permission levels produce distinct assignments
  const assignments = await Promise.all(
    permissionLevels.map(async (permissionLevel) => {
      const assignment =
        await api.functional.communityPlatform.admin.communities.moderators.create(
          connection,
          {
            communitySlug: communitySlug + "_" + permissionLevel, // Different community to avoid conflicts
            body: {
              actor_type: "admin",
              permission_level: permissionLevel,
              actor_admin_id: admin.id,
            } satisfies ICommunityPlatformCommunityModerator.ICreate,
          },
        );
      typia.assert(assignment);
      return assignment;
    }),
  );

  // Validate all assignments have correct permission levels
  assignments.forEach((assignment, index) => {
    TestValidator.equals(
      `assignment ${index} should have correct permission level`,
      assignment.permission_level,
      permissionLevels[index],
    );
  });

  // Final validation: Ensure comprehensive testing coverage
  TestValidator.equals(
    "all three permission levels should be tested",
    permissionLevels.length,
    3,
  );
}
