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
 * Test moderator assignment workflow where an administrator assigns moderator
 * privileges to another administrator. Validates cross-role moderator
 * assignments and permission escalation controls. Tests creation of moderator
 * assignment records with admin actor references and full permission levels.
 */
export async function test_api_community_moderator_assignment_admin_role(
  connection: api.IConnection,
) {
  // Step 1: Create first administrator account for authentication context
  const admin1Email = typia.random<string & tags.Format<"email">>();
  const admin1 = await api.functional.auth.admin.join(connection, {
    body: {
      email: admin1Email,
      password: "AdminPassword123!",
      display_name: RandomGenerator.name(),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin1);

  // Step 2: Create second administrator account to be assigned as moderator
  const admin2Email = typia.random<string & tags.Format<"email">>();
  const admin2 = await api.functional.auth.admin.join(connection, {
    body: {
      email: admin2Email,
      password: "AdminPassword456!",
      display_name: RandomGenerator.name(),
      admin_level: "content",
      is_super_admin: false,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin2);

  // Step 3: Create a valid community slug for the moderator assignment
  // Using a simple alphanumeric slug that should work for testing
  const communitySlug = RandomGenerator.alphaNumeric(15).toLowerCase();

  // Step 4: Assign moderator privileges from admin1 to admin2
  const moderatorAssignment =
    await api.functional.communityPlatform.admin.communities.moderators.create(
      connection,
      {
        communitySlug: communitySlug,
        body: {
          actor_type: "admin",
          permission_level: "full",
          actor_admin_id: admin2.id,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);

  // Step 5: Validate the moderator assignment record
  TestValidator.equals(
    "moderator assignment actor type should be admin",
    moderatorAssignment.actor_type,
    "admin",
  );
  TestValidator.equals(
    "moderator assignment permission level should be full",
    moderatorAssignment.permission_level,
    "full",
  );
  TestValidator.predicate(
    "moderator assignment community ID should be valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      moderatorAssignment.community_platform_community_id,
    ),
  );
  TestValidator.predicate(
    "moderator assignment should have assigned timestamp",
    moderatorAssignment.assigned_at !== null &&
      moderatorAssignment.assigned_at !== undefined,
  );
  TestValidator.predicate(
    "moderator assignment should have creation timestamp",
    moderatorAssignment.created_at !== null &&
      moderatorAssignment.created_at !== undefined,
  );
  TestValidator.predicate(
    "moderator assignment should have update timestamp",
    moderatorAssignment.updated_at !== null &&
      moderatorAssignment.updated_at !== undefined,
  );
  TestValidator.equals(
    "moderator assignment should not be revoked",
    moderatorAssignment.revoked_at,
    undefined,
  );
  TestValidator.equals(
    "moderator assignment should not be deleted",
    moderatorAssignment.deleted_at,
    undefined,
  );

  // Step 6: Validate actor reference in the moderator assignment
  TestValidator.predicate(
    "moderator assignment should have actor reference",
    moderatorAssignment.actor !== null &&
      moderatorAssignment.actor !== undefined,
  );

  // The actor should be an admin summary based on the actor_type
  TestValidator.equals(
    "actor ID should match the assigned admin",
    moderatorAssignment.actor.id,
    admin2.id,
  );
  TestValidator.equals(
    "actor display name should match the assigned admin",
    moderatorAssignment.actor.display_name,
    admin2.display_name,
  );

  // Validate community reference
  TestValidator.predicate(
    "moderator assignment should have community reference",
    moderatorAssignment.community !== null &&
      moderatorAssignment.community !== undefined,
  );
  TestValidator.equals(
    "community reference should have valid ID",
    typeof moderatorAssignment.community.id,
    "string",
  );
  TestValidator.equals(
    "community reference should have name",
    typeof moderatorAssignment.community.name,
    "string",
  );
  TestValidator.equals(
    "community reference should have slug",
    typeof moderatorAssignment.community.slug,
    "string",
  );
  TestValidator.equals(
    "community reference should have status",
    typeof moderatorAssignment.community.status,
    "string",
  );
  TestValidator.equals(
    "community reference should have privacy",
    typeof moderatorAssignment.community.privacy,
    "string",
  );
  TestValidator.predicate(
    "community reference should have creation timestamp",
    moderatorAssignment.community.created_at !== null &&
      moderatorAssignment.community.created_at !== undefined,
  );
}
