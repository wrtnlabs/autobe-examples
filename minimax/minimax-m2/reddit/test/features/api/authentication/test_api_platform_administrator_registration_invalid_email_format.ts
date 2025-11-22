import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

export async function test_api_platform_administrator_registration_invalid_email_format(
  connection: api.IConnection,
) {
  // Test invalid email formats that should be rejected

  // Test case 1: Email without @ symbol
  await TestValidator.error(
    "should reject email without @ symbol",
    async () => {
      await api.functional.auth.platformAdministrator.join(connection, {
        body: {
          username: "testadmin",
          email: "invalidemail.com", // Missing @ symbol
          password: "ValidPass123!",
          administrator_level: "admin",
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
              can_create_communities: false,
              can_modify_communities: false,
              can_suspend_communities: false,
              can_delete_communities: false,
              can_moderate_all_communities: false,
              can_view_community_data: true,
            },
            content_moderation: {
              can_remove_content: true,
              can_moderate_globally: false,
              can_manage_reports: false,
              can_shadowban_content: false,
              can_restore_content: false,
              can_view_hidden_content: false,
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
              can_view_analytics: false,
            },
          }),
          security_clearance: "medium",
        } satisfies IRedditPlatformPlatformAdministrator.ICreate,
      });
    },
  );

  // Test case 2: Email with invalid domain format
  await TestValidator.error(
    "should reject email with invalid domain",
    async () => {
      await api.functional.auth.platformAdministrator.join(connection, {
        body: {
          username: "testadmin2",
          email: "test@invalid",
          password: "ValidPass123!",
          administrator_level: "admin",
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
              can_create_communities: false,
              can_modify_communities: false,
              can_suspend_communities: false,
              can_delete_communities: false,
              can_moderate_all_communities: false,
              can_view_community_data: true,
            },
            content_moderation: {
              can_remove_content: true,
              can_moderate_globally: false,
              can_manage_reports: false,
              can_shadowban_content: false,
              can_restore_content: false,
              can_view_hidden_content: false,
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
              can_view_analytics: false,
            },
          }),
          security_clearance: "medium",
        } satisfies IRedditPlatformPlatformAdministrator.ICreate,
      });
    },
  );

  // Test case 3: Email with spaces
  await TestValidator.error("should reject email with spaces", async () => {
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: "testadmin3",
        email: "test email@example.com",
        password: "ValidPass123!",
        administrator_level: "admin",
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
            can_create_communities: false,
            can_modify_communities: false,
            can_suspend_communities: false,
            can_delete_communities: false,
            can_moderate_all_communities: false,
            can_view_community_data: true,
          },
          content_moderation: {
            can_remove_content: true,
            can_moderate_globally: false,
            can_manage_reports: false,
            can_shadowban_content: false,
            can_restore_content: false,
            can_view_hidden_content: false,
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
            can_view_analytics: false,
          },
        }),
        security_clearance: "medium",
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  });

  // Test case 4: Email with special characters
  await TestValidator.error(
    "should reject email with invalid special characters",
    async () => {
      await api.functional.auth.platformAdministrator.join(connection, {
        body: {
          username: "testadmin4",
          email: "test@domain#.com",
          password: "ValidPass123!",
          administrator_level: "admin",
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
              can_create_communities: false,
              can_modify_communities: false,
              can_suspend_communities: false,
              can_delete_communities: false,
              can_moderate_all_communities: false,
              can_view_community_data: true,
            },
            content_moderation: {
              can_remove_content: true,
              can_moderate_globally: false,
              can_manage_reports: false,
              can_shadowban_content: false,
              can_restore_content: false,
              can_view_hidden_content: false,
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
              can_view_analytics: false,
            },
          }),
          security_clearance: "medium",
        } satisfies IRedditPlatformPlatformAdministrator.ICreate,
      });
    },
  );

  // Test case 5: Empty email
  await TestValidator.error("should reject empty email", async () => {
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: "testadmin5",
        email: "",
        password: "ValidPass123!",
        administrator_level: "admin",
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
            can_create_communities: false,
            can_modify_communities: false,
            can_suspend_communities: false,
            can_delete_communities: false,
            can_moderate_all_communities: false,
            can_view_community_data: true,
          },
          content_moderation: {
            can_remove_content: true,
            can_moderate_globally: false,
            can_manage_reports: false,
            can_shadowban_content: false,
            can_restore_content: false,
            can_view_hidden_content: false,
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
            can_view_analytics: false,
          },
        }),
        security_clearance: "medium",
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  });
}
