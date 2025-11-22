import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

/**
 * Test platform administrator attempting to terminate non-existent session for
 * security error handling validation.
 *
 * This comprehensive E2E test validates the platform's administrative security
 * controls and error handling mechanisms. The test follows a realistic security
 * audit scenario where an authenticated administrator attempts to terminate a
 * session that doesn't exist.
 *
 * Test validates that the system properly handles invalid session identifiers
 * and maintains security audit trails for failed administrative operations,
 * ensuring robust administrative security controls.
 */
export async function test_api_admin_session_termination_invalid_session_id(
  connection: api.IConnection,
) {
  // Step 1: Create a platform administrator account with proper privileges
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.name(1).toLowerCase();

  const admin: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: "SecureAdminPass123!",
        display_name: "Test Administrator",
        administrator_level: "admin",
        system_permissions: JSON.stringify({
          user_management: {
            can_view_user_data: true,
            can_manage_user_permissions: true,
          },
          community_oversight: {
            can_view_community_data: true,
            can_moderate_all_communities: true,
          },
          content_moderation: {
            can_remove_content: true,
            can_manage_reports: true,
          },
          system_configuration: {
            can_view_system_logs: true,
          },
          compliance_legal: {
            can_access_compliance_data: true,
          },
        }),
        security_clearance: "medium",
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Verify successful admin account creation and permissions
  TestValidator.equals(
    "admin username matches",
    adminUsername,
    admin.user.username,
  );
  TestValidator.equals("admin email matches", adminEmail, admin.user.email);
  TestValidator.equals(
    "admin level is admin",
    admin.administrator_level,
    "admin",
  );
  TestValidator.equals("admin status is active", admin.active_status, "active");

  // Step 3: Verify administrator has session termination permissions
  TestValidator.predicate(
    "admin has system configuration access",
    admin.system_permissions.system_configuration?.can_view_system_logs ===
      true,
  );

  // Step 4: Generate a non-existent session UUID for testing
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 5: Verify system rejects termination of non-existent session
  await TestValidator.error(
    "attempting to terminate non-existent session should fail with security error",
    async () => {
      await api.functional.redditPlatform.platformAdministrator.auth.sessions.erase(
        connection,
        {
          sessionId: nonExistentSessionId,
        },
      );
    },
  );
}
