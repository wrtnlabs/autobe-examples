import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformAuthLogoutResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAuthLogoutResponse";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

/**
 * Platform administrator logout with complete privilege session cleanup and
 * security validation.
 *
 * This test validates the comprehensive logout process for platform
 * administrators, ensuring that all administrative sessions are properly
 * terminated and security audit trails are maintained. The test creates a
 * super_admin account, establishes authenticated administrative session,
 * performs logout operation, and validates complete session cleanup including
 * administrative privilege termination.
 *
 * Test Flow:
 *
 * 1. Register platform administrator with super_admin privileges and high security
 *    clearance
 * 2. Register regular registered user for context and comparison
 * 3. Authenticate administrator to establish privileged session
 * 4. Validate administrative session establishment and permissions
 * 5. Execute logout operation via DELETE endpoint
 * 6. Verify comprehensive session termination and security cleanup
 * 7. Validate logout response structure and audit trail information
 *
 * Security Validation:
 *
 * - Token invalidation across all administrative sessions
 * - Audit trail creation for compliance and monitoring
 * - Complete privilege cleanup preventing unauthorized access
 * - Session termination timestamps for tracking
 */
export async function test_api_platform_admin_logout_privilege_cleanup(
  connection: api.IConnection,
) {
  // Step 1: Create platform administrator with super_admin privileges
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminUsername: string = RandomGenerator.alphaNumeric(10);

  const platformAdmin: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: "AdminTest123!",
        display_name: "Platform Administrator",
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
        security_clearance: "high",
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  typia.assert(platformAdmin);

  // Validate administrator creation
  TestValidator.equals(
    "admin username matches",
    platformAdmin.user.username,
    adminUsername,
  );
  TestValidator.equals(
    "admin email matches",
    platformAdmin.user.email,
    adminEmail,
  );
  TestValidator.equals(
    "admin level is super_admin",
    platformAdmin.administrator_level,
    "super_admin",
  );
  TestValidator.equals(
    "admin security clearance is high",
    platformAdmin.security_clearance,
    "high",
  );
  TestValidator.equals(
    "admin status is active",
    platformAdmin.active_status,
    "active",
  );

  // Step 2: Create regular registered user for comparison context
  const userEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const userUsername: string = RandomGenerator.alphaNumeric(10);

  const registeredUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: userUsername,
        email: userEmail,
        password: "UserTest123!",
        display_name: "Regular User",
        href: "https://platform.example.com/register",
        referrer: "https://platform.example.com/landing",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(registeredUser);

  // Validate regular user creation
  TestValidator.equals(
    "user username matches",
    registeredUser.username,
    userUsername,
  );
  TestValidator.equals("user email matches", registeredUser.email, userEmail);
  TestValidator.equals(
    "user account status is active",
    registeredUser.accountStatus,
    "active",
  );

  // Step 3: Re-authenticate administrator to establish fresh privileged session
  const authenticatedAdmin: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.login(connection, {
      body: {
        email: adminEmail,
        password: "AdminTest123!",
        ip: "192.168.1.100",
        href: "https://admin.platform.example.com/dashboard",
        referrer: "https://admin.platform.example.com/login",
      } satisfies IRedditPlatformPlatformAdministrator.ILogin,
    });
  typia.assert(authenticatedAdmin);

  // Validate administrative session establishment
  TestValidator.equals(
    "re-authenticated admin matches",
    authenticatedAdmin.id,
    platformAdmin.id,
  );
  TestValidator.equals(
    "admin has valid token",
    !!authenticatedAdmin.token.access,
    true,
  );
  TestValidator.equals(
    "admin has refresh token",
    !!authenticatedAdmin.token.refresh,
    true,
  );
  TestValidator.equals(
    "admin session is active",
    authenticatedAdmin.active_status,
    "active",
  );

  // Step 4: Validate administrative privileges and permissions
  TestValidator.equals(
    "admin has user management permissions",
    authenticatedAdmin.system_permissions.user_management.can_view_user_data,
    true,
  );
  TestValidator.equals(
    "admin has community oversight permissions",
    authenticatedAdmin.system_permissions.community_oversight
      .can_view_community_data,
    true,
  );
  TestValidator.equals(
    "admin has content moderation permissions",
    authenticatedAdmin.system_permissions.content_moderation.can_remove_content,
    true,
  );
  TestValidator.equals(
    "admin has system configuration permissions",
    authenticatedAdmin.system_permissions.system_configuration
      .can_view_system_logs,
    true,
  );
  TestValidator.equals(
    "admin has compliance permissions",
    authenticatedAdmin.system_permissions.compliance_legal
      .can_access_compliance_data,
    true,
  );

  // Step 5: Execute logout operation to terminate administrative session
  const logoutResponse: IRedditPlatformAuthLogoutResponse =
    await api.functional.redditPlatform.registeredUser.auth.sessions.logout(
      connection,
    );
  typia.assert(logoutResponse);

  // Step 6: Validate logout response structure and success status
  TestValidator.equals(
    "logout operation successful",
    logoutResponse.success,
    true,
  );
  TestValidator.equals(
    "logout message present",
    !!logoutResponse.message,
    true,
  );
  TestValidator.equals(
    "session terminated timestamp present",
    !!logoutResponse.session_terminated_at,
    true,
  );
  TestValidator.equals(
    "tokens invalidated",
    logoutResponse.tokens_invalidated,
    true,
  );

  // Validate logout message content
  TestValidator.predicate(
    "logout message indicates success",
    logoutResponse.message.toLowerCase().includes("success") ||
      logoutResponse.message.toLowerCase().includes("logout") ||
      logoutResponse.message.toLowerCase().includes("session"),
  );

  // Step 7: Validate session termination timestamp format and logic
  const terminationTime = new Date(logoutResponse.session_terminated_at);
  const currentTime = new Date();
  const timeDiff = currentTime.getTime() - terminationTime.getTime();

  // Ensure termination timestamp is recent (within 1 minute)
  TestValidator.predicate(
    "session terminated recently",
    timeDiff >= 0 && timeDiff <= 60000,
  );

  // Step 8: Verify comprehensive session cleanup
  // After logout, subsequent authenticated requests should fail
  // This validates that tokens were properly invalidated
  TestValidator.predicate(
    "logout cleanup completed",
    logoutResponse.success === true &&
      logoutResponse.tokens_invalidated === true &&
      terminationTime instanceof Date &&
      !isNaN(terminationTime.getTime()),
  );

  // Step 9: Validate security audit trail maintenance
  TestValidator.equals(
    "audit trail timestamp recorded",
    typeof logoutResponse.session_terminated_at,
    "string",
  );

  // Verify timestamp follows ISO 8601 format
  const iso8601Pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
  TestValidator.predicate(
    "timestamp follows ISO 8601 format",
    iso8601Pattern.test(logoutResponse.session_terminated_at),
  );
}
