import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformChannel";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test moderator privilege level promotion workflow where administrators can
 * elevate moderator capabilities from community-level to global or super
 * moderator status.
 *
 * This comprehensive E2E test validates the complete moderator promotion
 * workflow:
 *
 * 1. Admin authentication and channel creation for context
 * 2. Moderator creation with initial community-level privileges
 * 3. Level promotion through admin update operation
 * 4. Verification of updated moderator permissions and access rights
 *
 * The test ensures security protocols are maintained during privilege
 * escalation and validates that level changes properly update moderator
 * capabilities.
 */
export async function test_api_moderator_level_promotion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for authentication context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "admin123" satisfies string as string,
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
        sort_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        is_active: true,
        status: "active",
      } satisfies ICommunityPlatformChannel.ICreate,
    });
  typia.assert(channel);

  // Step 3: Create moderator account with initial community-level privileges
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

  // Step 4: Verify initial moderator level before promotion
  const initialModerator: ICommunityPlatformModerator =
    await api.functional.communityPlatform.admin.moderators.at(connection, {
      moderatorId: moderator.id,
    });
  typia.assert(initialModerator);
  TestValidator.equals(
    "initial moderator level should be community",
    initialModerator.moderator_level,
    "community",
  );

  // Step 5: Promote moderator level to global moderator
  const updatedModerator: ICommunityPlatformModerator =
    await api.functional.communityPlatform.admin.moderators.update(connection, {
      moderatorId: moderator.id,
      body: {
        moderator_level: "global",
      } satisfies ICommunityPlatformModerator.IUpdate,
    });
  typia.assert(updatedModerator);

  // Step 6: Validate that level change was successful
  TestValidator.equals(
    "moderator level should be updated to global",
    updatedModerator.moderator_level,
    "global",
  );
  TestValidator.notEquals(
    "moderator level should differ from initial",
    updatedModerator.moderator_level,
    initialModerator.moderator_level,
  );

  // Step 7: Verify other moderator properties remain unchanged
  TestValidator.equals(
    "moderator ID should remain the same",
    updatedModerator.id,
    moderator.id,
  );
  TestValidator.equals(
    "moderator email should remain unchanged",
    updatedModerator.email,
    moderator.email,
  );
  TestValidator.equals(
    "moderator display name should remain unchanged",
    updatedModerator.display_name,
    moderator.display_name,
  );
  TestValidator.predicate(
    "moderator should remain active",
    updatedModerator.is_active,
  );
}
