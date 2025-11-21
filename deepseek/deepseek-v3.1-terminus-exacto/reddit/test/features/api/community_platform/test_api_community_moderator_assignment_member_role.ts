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
 * privileges to a community member. Validates that member actors can be
 * assigned moderator roles with appropriate permission levels. Tests creation
 * of moderator assignment records with member references and permission level
 * enforcement.
 *
 * This test focuses on the core moderator assignment functionality using the
 * available API operations. Since community and member creation APIs are not
 * provided, the test validates the assignment process with properly formatted
 * data that the system can process.
 */
export async function test_api_community_moderator_assignment_member_role(
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
        display_name: RandomGenerator.paragraph({ sentences: 2 }),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Test moderator assignment with valid UUID format data
  // Since community and member creation APIs are not available, we use properly
  // formatted UUIDs that match the expected format constraints
  const communitySlug = "existing-community-" + RandomGenerator.alphaNumeric(8);

  // Create moderator assignment with member actor type using valid UUID format
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

  // Step 3: Validate moderator assignment record structure
  TestValidator.equals(
    "actor type should be 'member'",
    moderatorAssignment.actor_type,
    "member",
  );
  TestValidator.equals(
    "permission level should be 'full'",
    moderatorAssignment.permission_level,
    "full",
  );
  TestValidator.predicate(
    "assigned_at timestamp should be set",
    moderatorAssignment.assigned_at !== null &&
      moderatorAssignment.assigned_at !== undefined,
  );
  TestValidator.predicate(
    "revoked_at should be null for active assignment",
    moderatorAssignment.revoked_at === null ||
      moderatorAssignment.revoked_at === undefined,
  );
  TestValidator.predicate(
    "created_at timestamp should be set",
    moderatorAssignment.created_at !== null &&
      moderatorAssignment.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp should be set",
    moderatorAssignment.updated_at !== null &&
      moderatorAssignment.updated_at !== undefined,
  );

  // Step 4: Validate community reference structure
  TestValidator.predicate(
    "community reference should exist",
    moderatorAssignment.community !== null &&
      moderatorAssignment.community !== undefined,
  );
  TestValidator.predicate(
    "community ID should be valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      moderatorAssignment.community.id,
    ),
  );

  // Step 5: Validate actor reference structure
  TestValidator.predicate(
    "actor reference should exist",
    moderatorAssignment.actor !== null &&
      moderatorAssignment.actor !== undefined,
  );

  // Since actor_type is 'member', validate the actor has member summary properties
  const memberActor =
    moderatorAssignment.actor as ICommunityPlatformMember.ISummary;
  TestValidator.predicate(
    "member actor should have valid ID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      memberActor.id,
    ),
  );
  TestValidator.predicate(
    "member actor should have display name",
    memberActor.display_name !== null &&
      memberActor.display_name !== undefined &&
      memberActor.display_name.length > 0,
  );
}
