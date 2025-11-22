import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdminSession";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

export async function test_api_platform_admin_session_retrieval_by_platform_administrator(
  connection: api.IConnection,
) {
  // Step 1: Create a platform administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = `admin_${RandomGenerator.alphaNumeric(8)}`;
  const adminPassword = "SecurePassword123!";

  const adminCreation = await api.functional.auth.platformAdministrator.join(
    connection,
    {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: adminPassword,
        administrator_level: "admin",
        security_clearance: "medium",
        system_permissions: JSON.stringify({
          user_management: {
            can_create_users: true,
            can_modify_users: true,
            can_suspend_users: false,
            can_ban_users: false,
            can_view_user_data: true,
            can_manage_user_permissions: false,
          },
          community_oversight: {
            can_create_communities: true,
            can_modify_communities: true,
            can_suspend_communities: true,
            can_delete_communities: false,
            can_moderate_all_communities: false,
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
  typia.assert(adminCreation);

  // Step 2: Authenticate as platform administrator with session context
  const adminLogin = await api.functional.auth.platformAdministrator.login(
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
  typia.assert(adminLogin);

  // Step 3: Generate a test session ID for retrieval
  const testSessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Retrieve session information as platform administrator
  const sessionInfo =
    await api.functional.redditPlatform.platformAdministrator.auth.sessions.at(
      connection,
      {
        sessionId: testSessionId,
      },
    );
  typia.assert(sessionInfo);

  // Step 5: Validate session information structure and content
  TestValidator.equals(
    "session ID should be UUID format",
    sessionInfo.id,
    testSessionId,
  );
  TestValidator.predicate(
    "session should have IP address",
    sessionInfo.ip.length > 0,
  );
  TestValidator.predicate(
    "session should have connection URL",
    sessionInfo.href.length > 0,
  );
  TestValidator.predicate(
    "session should have referrer URL",
    sessionInfo.referrer.length > 0,
  );
  TestValidator.predicate(
    "session should have creation timestamp",
    sessionInfo.created_at.length > 0,
  );

  // Validate timestamp format (ISO 8601)
  TestValidator.predicate(
    "creation timestamp should be valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(
      sessionInfo.created_at,
    ),
  );

  // Validate optional expiration timestamp if present
  if (sessionInfo.expired_at !== null && sessionInfo.expired_at !== undefined) {
    TestValidator.predicate(
      "expiration timestamp should be valid ISO 8601 format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(
        sessionInfo.expired_at,
      ),
    );
  }

  // Step 6: Verify admin permissions are properly set
  TestValidator.predicate(
    "administrator should have user data access",
    adminCreation.system_permissions.user_management.can_view_user_data,
  );
  TestValidator.predicate(
    "administrator should have compliance data access",
    adminCreation.system_permissions.compliance_legal
      .can_access_compliance_data,
  );
  TestValidator.predicate(
    "administrator should have system log access",
    adminCreation.system_permissions.system_configuration.can_view_system_logs,
  );

  // Step 7: Validate administrative session context
  TestValidator.equals(
    "admin level should be 'admin'",
    adminCreation.administrator_level,
    "admin",
  );
  TestValidator.equals(
    "security clearance should be 'medium'",
    adminCreation.security_clearance,
    "medium",
  );
  TestValidator.predicate(
    "admin should have active status",
    adminCreation.active_status === "active",
  );
}
