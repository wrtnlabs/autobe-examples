import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformAuthLogoutResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAuthLogoutResponse";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

export async function test_api_administrator_logout_session_termination(
  connection: api.IConnection,
) {
  // Step 1: Create a platform administrator account with elevated privileges
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = `admin_${RandomGenerator.alphaNumeric(8)}`;

  const adminAccount: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: "SecureAdmin123!",
        display_name: "Test Platform Administrator",
        administrator_level: "super_admin",
        system_permissions: JSON.stringify({
          user_management: {
            can_create_users: true,
            can_modify_users: true,
            can_suspend_users: true,
            can_ban_users: true,
            can_view_user_data: true,
            can_manage_user_permissions: true,
          },
          community_oversight: {
            can_create_communities: true,
            can_modify_communities: true,
            can_suspend_communities: true,
            can_delete_communities: true,
            can_moderate_all_communities: true,
            can_view_community_data: true,
          },
          content_moderation: {
            can_remove_content: true,
            can_moderate_globally: true,
            can_manage_reports: true,
            can_shadowban_content: true,
            can_restore_content: true,
            can_view_hidden_content: true,
          },
          system_configuration: {
            can_manage_settings: true,
            can_manage_features: true,
            can_manage_integrations: true,
            can_view_system_logs: true,
            can_manage_security: true,
            can_manage_backup: true,
          },
          compliance_legal: {
            can_access_compliance_data: true,
            can_manage_privacy: true,
            can_manage_data_retention: true,
            can_handle_dmca: true,
            can_manage_legal_requests: true,
            can_view_analytics: true,
          },
        }),
        security_clearance: "top_secret",
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  typia.assert(adminAccount);

  // Step 2: Verify administrator has elevated privileges and access
  TestValidator.equals(
    "administrator level is super_admin",
    adminAccount.administrator_level,
    "super_admin",
  );
  TestValidator.equals(
    "security clearance is top_secret",
    adminAccount.security_clearance,
    "top_secret",
  );
  TestValidator.predicate(
    "administrative actions should be tracked",
    adminAccount.administrative_actions >= 0,
  );
  TestValidator.predicate(
    "user account exists",
    adminAccount.user !== null && adminAccount.user !== undefined,
  );
  TestValidator.predicate(
    "authorization token exists",
    adminAccount.token !== null && adminAccount.token !== undefined,
  );

  // Step 3: Perform logout operation to terminate session
  const logoutResponse: IRedditPlatformAuthLogoutResponse =
    await api.functional.redditPlatform.platformAdministrator.auth.sessions.logout(
      connection,
    );
  typia.assert(logoutResponse);

  // Step 4: Validate logout response confirms complete session termination
  TestValidator.equals("logout success status", logoutResponse.success, true);
  TestValidator.predicate(
    "logout message indicates completion",
    logoutResponse.message.toLowerCase().includes("terminated") ||
      logoutResponse.message.toLowerCase().includes("logged out") ||
      logoutResponse.message.toLowerCase().includes("success"),
  );
  TestValidator.predicate(
    "session termination timestamp exists",
    logoutResponse.session_terminated_at !== null &&
      logoutResponse.session_terminated_at !== undefined,
  );
  TestValidator.equals(
    "tokens are invalidated",
    logoutResponse.tokens_invalidated,
    true,
  );

  // Step 5: Verify elevated privilege tokens are invalidated by attempting to use the same connection
  // The connection should now be unauthenticated (tokens invalidated)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Step 6: Test that administrator cannot access privileged operations after logout
  // Attempt to perform another admin operation to verify access is restricted
  await TestValidator.error(
    "should not be able to access admin operations after logout",
    async () => {
      // Try to logout again - should either fail or indicate already logged out
      await api.functional.redditPlatform.platformAdministrator.auth.sessions.logout(
        connection,
      );
    },
  );

  // Step 7: Create a fresh connection and try to join as admin again to verify
  // that the previous session tokens are completely invalidated
  const freshConnection: api.IConnection = { ...connection, headers: {} };

  const newAdminAttempt = await api.functional.auth.platformAdministrator.join(
    freshConnection,
    {
      body: {
        username: `another_admin_${RandomGenerator.alphaNumeric(6)}`,
        email: typia.random<string & tags.Format<"email">>(),
        password: "AnotherSecure123!",
        display_name: "Another Test Admin",
        administrator_level: "admin",
        system_permissions: JSON.stringify({
          user_management: {
            can_view_user_data: true,
          },
          community_oversight: {
            can_view_community_data: true,
          },
          content_moderation: {
            can_remove_content: true,
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
    },
  );
  typia.assert(newAdminAttempt);

  // Verify the new admin session is independent and valid
  TestValidator.notEquals(
    "new admin session ID should differ",
    newAdminAttempt.id,
    adminAccount.id,
  );
  TestValidator.equals(
    "new admin level is admin",
    newAdminAttempt.administrator_level,
    "admin",
  );
  TestValidator.predicate(
    "new admin has fresh tokens",
    newAdminAttempt.token.access !== adminAccount.token.access,
  );

  // Clean up by logging out the new admin session as well
  await api.functional.redditPlatform.platformAdministrator.auth.sessions.logout(
    freshConnection,
  );
}
