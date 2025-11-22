import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformAuthSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAuthSettings";
import type { IRedditPlatformNotificationSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformNotificationSettings";
import type { IRedditPlatformPasswordRequirements } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPasswordRequirements";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformPrivacySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPrivacySettings";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformSecuritySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSecuritySettings";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

/**
 * Test role-based access control for administrative settings endpoint.
 *
 * This test validates that only platform administrators can access the admin
 * settings endpoint while registered users are properly denied access. The test
 * creates multiple user accounts with different privilege levels and verifies
 * that authorization boundaries are properly enforced.
 *
 * Test Flow:
 *
 * 1. Create a registered user account for unauthorized access testing
 * 2. Login as registered user and attempt to access admin settings (should fail)
 * 3. Create a platform administrator account for authorized access testing
 * 4. Login as admin and successfully access admin settings (should succeed)
 * 5. Validate appropriate error responses and successful data retrieval
 */
export async function test_api_admin_settings_role_based_access(
  connection: api.IConnection,
) {
  // Create registered user for unauthorized access testing
  const registeredUserEmail = typia.random<string & tags.Format<"email">>();
  const registeredUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `testuser_${RandomGenerator.alphabets(6)}`,
        email: registeredUserEmail,
        password: "TestPassword123!",
        display_name: "Test User",
        bio: "Test registered user account",
        href: "https://test.example.com",
        referrer: "https://test.example.com/referrer",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(registeredUser);

  // Test unauthorized access - registered user should be denied
  await TestValidator.error(
    "registered user should be denied access to admin settings",
    async () => {
      await api.functional.redditPlatform.platformAdministrator.auth.settings(
        connection,
      );
    },
  );

  // Create platform administrator account for authorized access testing
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const platformAdmin: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: `admin_${RandomGenerator.alphabets(6)}`,
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: "Test Admin",
        administrator_level: "admin",
        system_permissions: JSON.stringify({
          user_management: {
            can_view_user_data: true,
          },
          system_configuration: {
            can_view_system_logs: true,
          },
          compliance_legal: {
            can_access_compliance_data: true,
          },
        }),
        security_clearance: "high",
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  typia.assert(platformAdmin);

  // Test authorized access - platform administrator should succeed
  const adminSettings: IRedditPlatformAuthSettings =
    await api.functional.redditPlatform.platformAdministrator.auth.settings(
      connection,
    );
  typia.assert(adminSettings);

  // Validate that admin settings contain expected data structure
  TestValidator.equals(
    "admin settings should contain user profile",
    adminSettings.user.id,
    platformAdmin.registered_user.id,
  );
  TestValidator.equals(
    "admin settings should contain privacy settings",
    adminSettings.privacy_settings !== undefined,
    true,
  );
  TestValidator.equals(
    "admin settings should contain notification settings",
    adminSettings.notification_settings !== undefined,
    true,
  );
  TestValidator.equals(
    "admin settings should contain security settings",
    adminSettings.security_settings !== undefined,
    true,
  );
}
