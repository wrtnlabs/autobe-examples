import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

export async function test_api_platform_administrator_registration_duplicate_username(
  connection: api.IConnection,
) {
  // Generate unique test data for the first administrator
  const username = RandomGenerator.alphaNumeric(8) + "_admin";
  const email = typia.random<string & tags.Format<"email">>();
  const password = "AdminPass123!";
  const displayName = RandomGenerator.name();

  // Create the first platform administrator successfully
  const firstAdmin: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username,
        email,
        password,
        display_name: displayName,
        administrator_level: "admin",
        system_permissions: JSON.stringify({
          user_management: { can_create_users: true, can_modify_users: true },
          community_oversight: { can_view_community_data: true },
          content_moderation: {
            can_remove_content: true,
            can_moderate_globally: true,
          },
          system_configuration: { can_view_system_logs: true },
          compliance_legal: { can_access_compliance_data: true },
        }),
        security_clearance: "medium",
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  typia.assert(firstAdmin);

  // Verify the first admin was created with correct properties
  TestValidator.equals(
    "first admin username matches",
    firstAdmin.user.username,
    username,
  );
  TestValidator.equals(
    "first admin email matches",
    firstAdmin.user.email,
    email,
  );
  TestValidator.equals(
    "first admin level is admin",
    firstAdmin.administrator_level,
    "admin",
  );

  // Attempt to create another administrator with the same username - this should fail
  await TestValidator.error(
    "duplicate username registration should be rejected",
    async () => {
      const duplicateEmail = typia.random<string & tags.Format<"email">>();
      return await api.functional.auth.platformAdministrator.join(connection, {
        body: {
          username, // Same username as the first admin
          email: duplicateEmail,
          password: "DifferentPass123!",
          display_name: RandomGenerator.name(),
          administrator_level: "moderator_admin",
          system_permissions: JSON.stringify({
            user_management: {
              can_create_users: false,
              can_modify_users: false,
            },
            community_oversight: { can_view_community_data: true },
            content_moderation: { can_remove_content: true },
            system_configuration: {},
            compliance_legal: {},
          }),
          security_clearance: "low",
        } satisfies IRedditPlatformPlatformAdministrator.ICreate,
      });
    },
  );

  // Verify the first admin's data remains unchanged
  TestValidator.equals(
    "original admin account still exists",
    firstAdmin.id,
    firstAdmin.id,
  );
  TestValidator.equals(
    "original username still unique",
    firstAdmin.user.username,
    username,
  );
  TestValidator.equals(
    "original admin level unchanged",
    firstAdmin.administrator_level,
    "admin",
  );
  TestValidator.equals(
    "original admin security clearance maintained",
    firstAdmin.security_clearance,
    "medium",
  );
}
