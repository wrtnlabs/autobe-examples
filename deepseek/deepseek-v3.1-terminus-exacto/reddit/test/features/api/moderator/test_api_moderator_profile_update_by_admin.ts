import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformChannel";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test that platform administrators can update moderator account details
 * including display name, moderator level, and account status. Validates that
 * administrators can modify moderator profiles while preserving authentication
 * integrity and ensuring proper authorization checks.
 */
export async function test_api_moderator_profile_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!" satisfies string &
          tags.Format<"password">,
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create prerequisite channel
  const channel: ICommunityPlatformChannel =
    await api.functional.communityPlatform.admin.channels.create(connection, {
      body: {
        name: RandomGenerator.alphabets(10),
        display_name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        sort_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        is_active: true,
        status: "active" as const,
      } satisfies ICommunityPlatformChannel.ICreate,
    });
  typia.assert(channel);

  // Step 3: Create moderator account to be updated
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

  // Step 4: Retrieve moderator details before update
  const moderatorBeforeUpdate: ICommunityPlatformModerator =
    await api.functional.communityPlatform.admin.moderators.at(connection, {
      moderatorId: moderator.id,
    });
  typia.assert(moderatorBeforeUpdate);

  // Step 5: Update moderator profile with new values
  const updatedModerator: ICommunityPlatformModerator =
    await api.functional.communityPlatform.admin.moderators.update(connection, {
      moderatorId: moderator.id,
      body: {
        display_name: "Updated " + RandomGenerator.name(),
        moderator_level: "global",
        is_active: false,
      } satisfies ICommunityPlatformModerator.IUpdate,
    });
  typia.assert(updatedModerator);

  // Step 6: Verify updates were applied correctly
  TestValidator.predicate(
    "display name should start with 'Updated'",
    updatedModerator.display_name.startsWith("Updated"),
  );
  TestValidator.equals(
    "moderator level should be updated",
    updatedModerator.moderator_level,
    "global",
  );
  TestValidator.equals(
    "account status should be updated",
    updatedModerator.is_active,
    false,
  );
  TestValidator.equals(
    "email should remain unchanged",
    updatedModerator.email,
    moderatorBeforeUpdate.email,
  );
  TestValidator.equals(
    "moderator ID should remain unchanged",
    updatedModerator.id,
    moderatorBeforeUpdate.id,
  );
}
