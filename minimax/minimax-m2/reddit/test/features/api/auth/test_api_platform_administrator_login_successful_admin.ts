import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

/**
 * Test successful platform administrator login for admin-level user with
 * appropriate privilege verification and session context tracking.
 *
 * Test Objective: Validate that a platform administrator can successfully
 * authenticate and receive proper admin-level session tokens with appropriate
 * privilege verification.
 *
 * Test Flow:
 *
 * 1. Prerequisite Setup: Create a new platform administrator account using the
 *    join API with admin-level privileges
 * 2. Admin Account Creation: Call POST /auth/platformAdministrator/join with valid
 *    credentials including administrator_level="admin" and appropriate system
 *    permissions
 * 3. Login Authentication: Call POST /auth/platformAdministrator/login with the
 *    created admin credentials and proper session context (IP, href, referrer)
 * 4. Response Validation: Verify the login response contains proper admin-level
 *    authorization data including administrative privileges and session tokens
 *
 * Expected Results:
 *
 * - Admin account creation succeeds and returns IAuthorized data with admin
 *   privileges
 * - Login authentication succeeds and returns proper JWT tokens
 * - Response contains correct administrator_level="admin"
 * - Response includes proper system_permissions structure for admin-level access
 * - Response contains valid IAuthorizationToken with access/refresh tokens
 * - Response includes proper session context tracking (appointed_by,
 *   administrative_actions, etc.)
 *
 * Business Context: This test validates the core administrative authentication
 * flow for the Reddit-like platform, ensuring admin users can properly
 * authenticate and receive appropriate system access privileges for platform
 * management operations.
 */
export async function test_api_platform_administrator_login_successful_admin(
  connection: api.IConnection,
) {
  // Generate random admin credentials for testing
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<128>
  >();
  const adminUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const displayName = RandomGenerator.name();

  // Create admin account using join API
  const adminAccount = await api.functional.auth.platformAdministrator.join(
    connection,
    {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: adminPassword,
        display_name: displayName,
        administrator_level: "admin",
        system_permissions: JSON.stringify({
          user_management: {
            can_create_users: true,
            can_modify_users: true,
            can_suspend_users: true,
            can_ban_users: false,
            can_view_user_data: true,
            can_manage_user_permissions: true,
          },
          community_oversight: {
            can_create_communities: true,
            can_modify_communities: true,
            can_suspend_communities: true,
            can_delete_communities: false,
            can_moderate_all_communities: true,
            can_view_community_data: true,
          },
          content_moderation: {
            can_remove_content: true,
            can_moderate_globally: true,
            can_manage_reports: true,
            can_shadowban_content: false,
            can_restore_content: true,
            can_view_hidden_content: true,
          },
          system_configuration: {
            can_manage_settings: true,
            can_manage_features: true,
            can_manage_integrations: false,
            can_view_system_logs: true,
            can_manage_security: true,
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
        security_clearance: "medium",
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    },
  );

  // Validate admin account creation response
  typia.assert(adminAccount);
  TestValidator.equals(
    "administrator level should be admin",
    adminAccount.administrator_level,
    "admin",
  );
  TestValidator.equals(
    "security clearance should be medium",
    adminAccount.security_clearance,
    "medium",
  );
  TestValidator.equals(
    "active status should be active",
    adminAccount.active_status,
    "active",
  );
  TestValidator.equals(
    "access level should be global",
    adminAccount.access_level,
    "global",
  );
  TestValidator.predicate(
    "administrative actions should be zero initially",
    adminAccount.administrative_actions === 0,
  );

  // Test successful login with proper session context
  const loginResponse = await api.functional.auth.platformAdministrator.login(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: "192.168.1.100",
        href: "https://admin.example.com/login",
        referrer: "https://admin.example.com",
      } satisfies IRedditPlatformPlatformAdministrator.ILogin,
    },
  );

  // Validate login response
  typia.assert(loginResponse);
  TestValidator.equals(
    "login administrator level should be admin",
    loginResponse.administrator_level,
    "admin",
  );
  TestValidator.equals(
    "login security clearance should be medium",
    loginResponse.security_clearance,
    "medium",
  );
  TestValidator.equals(
    "login active status should be active",
    loginResponse.active_status,
    "active",
  );
  TestValidator.equals(
    "login access level should be global",
    loginResponse.access_level,
    "global",
  );

  // Validate JWT tokens are present
  TestValidator.equals(
    "access token should be present",
    !!loginResponse.token.access,
    true,
  );
  TestValidator.equals(
    "refresh token should be present",
    !!loginResponse.token.refresh,
    true,
  );
  TestValidator.predicate(
    "access token should be non-empty string",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be non-empty string",
    loginResponse.token.refresh.length > 0,
  );

  // Validate token expiration dates
  typia.assert(loginResponse.token.expired_at);
  typia.assert(loginResponse.token.refreshable_until);
  TestValidator.predicate(
    "access token expiration should be in future",
    new Date(loginResponse.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refresh token expiration should be in future",
    new Date(loginResponse.token.refreshable_until) > new Date(),
  );

  // Validate user data is included
  typia.assert(loginResponse.user);
  typia.assert(loginResponse.registered_user);
  TestValidator.equals(
    "username should match",
    loginResponse.user.username,
    adminUsername,
  );
  TestValidator.equals(
    "email should match",
    loginResponse.user.email,
    adminEmail,
  );
  TestValidator.equals(
    "registered user username should match",
    loginResponse.registered_user.username,
    adminUsername,
  );

  // Validate appointment context is present
  TestValidator.equals(
    "appointed by should be present",
    !!loginResponse.appointed_by,
    true,
  );
  typia.assert(loginResponse.appointed_at);
  TestValidator.predicate(
    "appointment should be in past",
    new Date(loginResponse.appointed_at) <= new Date(),
  );

  // Validate system permissions structure
  typia.assert(loginResponse.system_permissions);
  TestValidator.predicate(
    "user management permissions should exist",
    !!loginResponse.system_permissions.user_management,
  );
  TestValidator.predicate(
    "community oversight permissions should exist",
    !!loginResponse.system_permissions.community_oversight,
  );
  TestValidator.predicate(
    "content moderation permissions should exist",
    !!loginResponse.system_permissions.content_moderation,
  );
  TestValidator.predicate(
    "system configuration permissions should exist",
    !!loginResponse.system_permissions.system_configuration,
  );
  TestValidator.predicate(
    "compliance legal permissions should exist",
    !!loginResponse.system_permissions.compliance_legal,
  );

  // Validate admin-level permissions are properly set
  TestValidator.equals(
    "can create users permission",
    loginResponse.system_permissions.user_management.can_create_users,
    true,
  );
  TestValidator.equals(
    "can modify users permission",
    loginResponse.system_permissions.user_management.can_modify_users,
    true,
  );
  TestValidator.equals(
    "can view user data permission",
    loginResponse.system_permissions.user_management.can_view_user_data,
    true,
  );
  TestValidator.equals(
    "can moderate all communities permission",
    loginResponse.system_permissions.community_oversight
      .can_moderate_all_communities,
    true,
  );
  TestValidator.equals(
    "can remove content permission",
    loginResponse.system_permissions.content_moderation.can_remove_content,
    true,
  );
  TestValidator.equals(
    "can manage settings permission",
    loginResponse.system_permissions.system_configuration.can_manage_settings,
    true,
  );
  TestValidator.equals(
    "can access compliance data permission",
    loginResponse.system_permissions.compliance_legal
      .can_access_compliance_data,
    true,
  );

  // Validate session context tracking
  TestValidator.predicate(
    "administrative actions should be tracked",
    loginResponse.administrative_actions >= 0,
  );
  typia.assert(loginResponse.last_administrative_action);

  // Validate timestamps are valid
  typia.assert(loginResponse.created_at);
  typia.assert(loginResponse.updated_at);
  TestValidator.predicate(
    "created at should be in past",
    new Date(loginResponse.created_at) <= new Date(),
  );
  TestValidator.predicate(
    "updated at should be in past",
    new Date(loginResponse.updated_at) <= new Date(),
  );

  // Verify that both join and login responses are consistent
  TestValidator.equals(
    "ID should be consistent between join and login",
    loginResponse.id,
    adminAccount.id,
  );
  TestValidator.equals(
    "administrator level should be consistent",
    loginResponse.administrator_level,
    adminAccount.administrator_level,
  );
  TestValidator.equals(
    "security clearance should be consistent",
    loginResponse.security_clearance,
    adminAccount.security_clearance,
  );
}
