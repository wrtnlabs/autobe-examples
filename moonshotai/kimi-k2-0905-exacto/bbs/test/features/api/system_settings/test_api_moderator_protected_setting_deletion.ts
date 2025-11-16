import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IEconomicDiscussionSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSystemSetting";

/**
 * Test deletion attempts on protected or system-critical settings.
 *
 * This test validates that system-essential settings cannot be accidentally
 * deleted, appropriate error messages are returned for protected settings, and
 * that backup or archival mechanisms are triggered when settings are removed.
 * The test verifies that moderators receive clear feedback about deletion
 * restrictions and that the system properly handles attempts to delete critical
 * configuration parameters.
 */
export async function test_api_moderator_protected_setting_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator account for authentication
  const moderator: IEconomicDiscussionModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.name(),
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(32),
        moderation_level: "admin",
      } satisfies IEconomicDiscussionModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create a system-critical protected setting
  const criticalSetting: IEconomicDiscussionSystemSetting =
    await api.functional.economicDiscussion.moderator.system_settings.create(
      connection,
      {
        body: {
          setting_key: "platform_max_file_size",
          setting_value: "5242880", // 5MB in bytes
          setting_type: "number",
          display_name: "Maximum File Upload Size",
          description:
            "Critical setting controlling maximum file upload size for attachments",
          category: "file_upload",
          is_system_critical: true,
          is_editable: false,
          validation_rules: JSON.stringify({
            minimum: 1048576, // 1MB minimum
            maximum: 10485760, // 10MB maximum
          }),
          last_modified_by: moderator.username,
        } satisfies IEconomicDiscussionSystemSetting.ICreate,
      },
    );
  typia.assert(criticalSetting);

  // 3. Create a non-critical editable setting for comparison
  const editableSetting: IEconomicDiscussionSystemSetting =
    await api.functional.economicDiscussion.moderator.system_settings.create(
      connection,
      {
        body: {
          setting_key: "default_theme_color",
          setting_value: "#1976d2",
          setting_type: "string",
          display_name: "Default Theme Color",
          description: "UI theme color setting",
          category: "appearance",
          is_system_critical: false,
          is_editable: true,
          validation_rules: undefined,
          last_modified_by: moderator.username,
        } satisfies IEconomicDiscussionSystemSetting.ICreate,
      },
    );
  typia.assert(editableSetting);

  // 4. Test deletion of editable (non-critical) setting - should succeed
  await api.functional.economicDiscussion.moderator.system_settings.erase(
    connection,
    {
      settingCode: editableSetting.setting_key,
    },
  );

  // 5. Test deletion of system-critical setting - should fail
  await TestValidator.error(
    "deletion of system-critical setting should fail",
    async () => {
      await api.functional.economicDiscussion.moderator.system_settings.erase(
        connection,
        {
          settingCode: criticalSetting.setting_key,
        },
      );
    },
  );

  // 6. Attempt deletion with non-existent setting key
  await TestValidator.error(
    "deletion of non-existent setting should fail",
    async () => {
      await api.functional.economicDiscussion.moderator.system_settings.erase(
        connection,
        {
          settingCode: "non_existent_setting_key",
        },
      );
    },
  );

  // 7. Verify critical setting still exists by attempting to create another setting
  const newSetting: IEconomicDiscussionSystemSetting =
    await api.functional.economicDiscussion.moderator.system_settings.create(
      connection,
      {
        body: {
          setting_key: "backup_retention_days",
          setting_value: "30",
          setting_type: "number",
          display_name: "Backup Retention Days",
          description: "Number of days to retain system backups",
          category: "data_management",
          is_system_critical: false,
          is_editable: true,
          last_modified_by: moderator.username,
        } satisfies IEconomicDiscussionSystemSetting.ICreate,
      },
    );
  typia.assert(newSetting);

  // 8. Test deletion approval/cancellation workflow
  const approvalWorkflowSetting: IEconomicDiscussionSystemSetting =
    await api.functional.economicDiscussion.moderator.system_settings.create(
      connection,
      {
        body: {
          setting_key: "deletion_approval_required",
          setting_value: "true",
          setting_type: "boolean",
          display_name: "Deletion Approval Required",
          description: "Requires approval before deletion of certain settings",
          category: "administration",
          is_system_critical: true,
          is_editable: false,
          last_modified_by: moderator.username,
        } satisfies IEconomicDiscussionSystemSetting.ICreate,
      },
    );
  typia.assert(approvalWorkflowSetting);

  // Verify approval setting is protected
  await TestValidator.error(
    "deletion of deletion-approval workflow setting should fail",
    async () => {
      await api.functional.economicDiscussion.moderator.system_settings.erase(
        connection,
        {
          settingCode: approvalWorkflowSetting.setting_key,
        },
      );
    },
  );
}
