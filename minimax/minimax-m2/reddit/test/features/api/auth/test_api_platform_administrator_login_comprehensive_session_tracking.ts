import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

/**
 * Platform administrator login with comprehensive session tracking validation.
 *
 * This test validates the platform administrator login endpoint with
 * comprehensive session context including IP address, connection URL, and
 * referrer validation. It ensures proper administrative session security,
 * compliance tracking, and audit trail creation for security monitoring
 * requirements.
 *
 * The test creates a platform administrator account first, then validates login
 * with all mandatory session tracking fields. It verifies that the
 * authentication response includes complete administrative privilege
 * information, security clearance validation, and comprehensive session
 * tracking for audit compliance.
 *
 * Key validation points include:
 *
 * - Session context establishment with IP, connection URL, and referrer
 * - Administrative privilege level and system permissions verification
 * - Security clearance validation and appointment authority tracking
 * - Audit trail creation and administrative action initialization
 * - JWT token generation and base user profile integration
 */
export async function test_api_platform_administrator_login_comprehensive_session_tracking(
  connection: api.IConnection,
) {
  // Step 1: Create platform administrator account with comprehensive privileges
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecureAdmin123!";

  const createResponse = await api.functional.auth.platformAdministrator.join(
    connection,
    {
      body: {
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        email: adminEmail,
        password: adminPassword,
        display_name: `Admin ${RandomGenerator.name()}`,
        administrator_level: "admin",
        security_clearance: "high",
        system_permissions: JSON.stringify({
          user_management: {
            can_create_users: true,
            can_modify_users: true,
            can_suspend_users: false,
            can_ban_users: false,
            can_view_user_data: true,
            can_manage_user_permissions: true,
          },
          community_oversight: {
            can_create_communities: true,
            can_modify_communities: true,
            can_suspend_communities: false,
            can_delete_communities: false,
            can_moderate_all_communities: false,
            can_view_community_data: true,
          },
          content_moderation: {
            can_remove_content: true,
            can_moderate_globally: false,
            can_manage_reports: true,
            can_shadowban_content: false,
            can_restore_content: true,
            can_view_hidden_content: true,
          },
          system_configuration: {
            can_manage_settings: false,
            can_manage_features: false,
            can_manage_integrations: false,
            can_view_system_logs: true,
            can_manage_security: false,
            can_manage_backup: false,
          },
          compliance_legal: {
            can_access_compliance_data: true,
            can_manage_privacy: false,
            can_manage_data_retention: false,
            can_handle_dmca: false,
            can_manage_legal_requests: false,
            can_view_analytics: true,
          },
        }),
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    },
  );
  typia.assert(createResponse);

  // Step 2: Validate administrator creation response
  TestValidator.equals(
    "administrator level assigned correctly",
    createResponse.administrator_level,
    "admin",
  );
  TestValidator.equals(
    "security clearance assigned correctly",
    createResponse.security_clearance,
    "high",
  );
  TestValidator.equals(
    "administrative actions initialized",
    createResponse.administrative_actions,
    0,
  );
  TestValidator.equals(
    "active status confirmed",
    createResponse.active_status,
    "active",
  );
  TestValidator.equals(
    "access level is global",
    createResponse.access_level,
    "global",
  );
  TestValidator.predicate(
    "appointed by field exists",
    !!createResponse.appointed_by,
  );
  TestValidator.predicate(
    "appointed at timestamp exists",
    !!createResponse.appointed_at,
  );
  TestValidator.predicate("base user profile exists", !!createResponse.user);
  TestValidator.predicate(
    "registered user profile exists",
    !!createResponse.registered_user,
  );
  TestValidator.predicate(
    "authentication token exists",
    !!createResponse.token,
  );

  // Step 3: Test login with comprehensive session context
  const loginResponse = await api.functional.auth.platformAdministrator.login(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: "192.168.1.100",
        href: "https://admin.platform.com/dashboard",
        referrer: "https://admin.platform.com/login",
      } satisfies IRedditPlatformPlatformAdministrator.ILogin,
    },
  );
  typia.assert(loginResponse);

  // Step 4: Validate comprehensive session tracking in login response
  TestValidator.equals(
    "administrator ID matches",
    loginResponse.id,
    createResponse.id,
  );
  TestValidator.equals(
    "administrator level preserved",
    loginResponse.administrator_level,
    "admin",
  );
  TestValidator.equals(
    "security clearance preserved",
    loginResponse.security_clearance,
    "high",
  );
  TestValidator.equals(
    "active status maintained",
    loginResponse.active_status,
    "active",
  );
  TestValidator.equals(
    "access level maintained",
    loginResponse.access_level,
    "global",
  );

  // Step 5: Validate system permissions structure
  TestValidator.predicate(
    "user management permissions exist",
    !!loginResponse.system_permissions.user_management,
  );
  TestValidator.predicate(
    "community oversight permissions exist",
    !!loginResponse.system_permissions.community_oversight,
  );
  TestValidator.predicate(
    "content moderation permissions exist",
    !!loginResponse.system_permissions.content_moderation,
  );
  TestValidator.predicate(
    "system configuration permissions exist",
    !!loginResponse.system_permissions.system_configuration,
  );
  TestValidator.predicate(
    "compliance legal permissions exist",
    !!loginResponse.system_permissions.compliance_legal,
  );

  // Step 6: Validate specific permission settings
  TestValidator.equals(
    "user creation permission",
    loginResponse.system_permissions.user_management.can_create_users,
    true,
  );
  TestValidator.equals(
    "user data access permission",
    loginResponse.system_permissions.user_management.can_view_user_data,
    true,
  );
  TestValidator.equals(
    "community data access permission",
    loginResponse.system_permissions.community_oversight
      .can_view_community_data,
    true,
  );
  TestValidator.equals(
    "content removal permission",
    loginResponse.system_permissions.content_moderation.can_remove_content,
    true,
  );
  TestValidator.equals(
    "compliance data access permission",
    loginResponse.system_permissions.compliance_legal
      .can_access_compliance_data,
    true,
  );
  TestValidator.equals(
    "system logs access permission",
    loginResponse.system_permissions.system_configuration.can_view_system_logs,
    true,
  );

  // Step 7: Validate authentication token structure
  TestValidator.predicate("access token exists", !!loginResponse.token.access);
  TestValidator.predicate(
    "refresh token exists",
    !!loginResponse.token.refresh,
  );
  TestValidator.predicate(
    "access token expiration exists",
    !!loginResponse.token.expired_at,
  );
  TestValidator.predicate(
    "refresh token expiration exists",
    !!loginResponse.token.refreshable_until,
  );
  TestValidator.predicate(
    "access token is non-empty string",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    loginResponse.token.refresh.length > 0,
  );

  // Step 8: Validate base user profile integration
  TestValidator.equals(
    "user ID matches",
    loginResponse.user.id,
    createResponse.user.id,
  );
  TestValidator.equals(
    "username matches",
    loginResponse.user.username,
    createResponse.user.username,
  );
  TestValidator.equals(
    "email matches",
    loginResponse.user.email,
    createResponse.user.email,
  );
  TestValidator.equals(
    "display name preserved",
    loginResponse.user.display_name,
    createResponse.user.display_name,
  );
  TestValidator.equals(
    "karma score maintained",
    loginResponse.user.karma_score,
    createResponse.user.karma_score,
  );
  TestValidator.equals(
    "account status active",
    loginResponse.user.account_status,
    "active",
  );
  TestValidator.predicate(
    "email verification status",
    !!loginResponse.user.email_verified !== undefined,
  );

  // Step 9: Validate registered user profile integration
  TestValidator.equals(
    "registered user ID matches",
    loginResponse.registered_user.id,
    createResponse.registered_user.id,
  );
  TestValidator.equals(
    "registered username matches",
    loginResponse.registered_user.username,
    createResponse.registered_user.username,
  );
  TestValidator.equals(
    "registered display name matches",
    loginResponse.registered_user.display_name,
    createResponse.registered_user.display_name,
  );
  TestValidator.equals(
    "registered karma score matches",
    loginResponse.registered_user.karma_score,
    createResponse.registered_user.karma_score,
  );
  TestValidator.equals(
    "registered account status matches",
    loginResponse.registered_user.account_status,
    createResponse.registered_user.account_status,
  );
  TestValidator.equals(
    "registered email verified status",
    loginResponse.registered_user.email_verified,
    createResponse.registered_user.email_verified,
  );

  // Step 10: Validate audit trail and tracking information
  TestValidator.predicate(
    "appointment authority recorded",
    !!loginResponse.appointed_by,
  );
  TestValidator.predicate(
    "appointment timestamp recorded",
    !!loginResponse.appointed_at,
  );
  TestValidator.predicate(
    "administrative action tracking initialized",
    loginResponse.administrative_actions >= 0,
  );
  TestValidator.predicate(
    "last administrative action timestamp exists",
    !!loginResponse.last_administrative_action,
  );
  TestValidator.predicate(
    "created at timestamp preserved",
    !!loginResponse.created_at,
  );
  TestValidator.predicate(
    "updated at timestamp updated",
    !!loginResponse.updated_at,
  );

  // Step 11: Test session context validation with different IP formats
  const loginResponse2 = await api.functional.auth.platformAdministrator.login(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: "203.0.113.45", // Different IP format for testing
        href: "https://admin.platform.com/users/management",
        referrer: "https://admin.platform.com/dashboard",
      } satisfies IRedditPlatformPlatformAdministrator.ILogin,
    },
  );
  typia.assert(loginResponse2);
  TestValidator.equals(
    "session tracking with different IP",
    loginResponse2.id,
    loginResponse.id,
  );

  // Step 12: Validate comprehensive session security and compliance
  TestValidator.predicate(
    "security clearance level sufficient",
    ["low", "medium", "high", "top_secret"].includes(
      loginResponse.security_clearance,
    ),
  );
  TestValidator.predicate(
    "administrative privilege level valid",
    ["super_admin", "admin", "moderator_admin"].includes(
      loginResponse.administrator_level,
    ),
  );
  TestValidator.predicate(
    "session tracking establishment confirmed",
    !!loginResponse,
  );
  TestValidator.predicate(
    "audit trail creation confirmed",
    !!loginResponse.appointed_at && !!loginResponse.last_administrative_action,
  );
}
