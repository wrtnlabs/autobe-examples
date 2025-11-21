import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformChannel";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test moderator account deactivation workflow where administrators can
 * temporarily suspend moderator accounts while preserving moderation history
 * and community assignments.
 *
 * This comprehensive test validates the complete business flow from admin
 * authentication through moderator creation to account deactivation, ensuring
 * proper status transitions and data integrity maintenance for reactivation
 * scenarios.
 */
export async function test_api_moderator_account_deactivation_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create prerequisite channel for moderator context
  const channel: ICommunityPlatformChannel =
    await api.functional.communityPlatform.admin.channels.create(connection, {
      body: {
        name: RandomGenerator.alphabets(10),
        display_name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        sort_order: 1,
        is_active: true,
        status: "active",
      } satisfies ICommunityPlatformChannel.ICreate,
    });
  typia.assert(channel);

  // Step 3: Create active moderator account to be deactivated
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        display_name: RandomGenerator.name(),
        moderator_level: "community",
        is_active: true,
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 4: Verify moderator is active before deactivation
  const activeModerator: ICommunityPlatformModerator =
    await api.functional.communityPlatform.admin.moderators.at(connection, {
      moderatorId: moderator.id,
    });
  typia.assert(activeModerator);
  TestValidator.predicate(
    "moderator should be active before deactivation",
    activeModerator.is_active,
  );

  // Step 5: Perform account deactivation
  const deactivatedModerator: ICommunityPlatformModerator =
    await api.functional.communityPlatform.admin.moderators.update(connection, {
      moderatorId: moderator.id,
      body: {
        is_active: false,
      } satisfies ICommunityPlatformModerator.IUpdate,
    });
  typia.assert(deactivatedModerator);

  // Step 6: Validate deactivation was successful
  TestValidator.predicate(
    "moderator should be inactive after deactivation",
    !deactivatedModerator.is_active,
  );

  // Step 7: Verify data integrity is maintained
  TestValidator.equals(
    "moderator ID should remain unchanged",
    deactivatedModerator.id,
    moderator.id,
  );
  TestValidator.equals(
    "moderator email should remain unchanged",
    deactivatedModerator.email,
    moderator.email,
  );
  TestValidator.equals(
    "moderator display name should remain unchanged",
    deactivatedModerator.display_name,
    moderator.display_name,
  );
  TestValidator.equals(
    "moderator level should remain unchanged",
    deactivatedModerator.moderator_level,
    moderator.moderator_level,
  );

  // Step 8: Verify audit trail maintenance
  TestValidator.predicate(
    "created_at timestamp should be present",
    deactivatedModerator.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp should be updated",
    deactivatedModerator.updated_at !== undefined,
  );
  TestValidator.notEquals(
    "updated_at should differ from created_at after modification",
    deactivatedModerator.updated_at,
    deactivatedModerator.created_at,
  );
}
