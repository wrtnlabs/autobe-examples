import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IEconomicDiscussionSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSystemSetting";

/**
 * Test updating system-critical settings that require special authorization.
 *
 * This test validates the complete workflow for modifying critical system
 * configuration parameters that control platform stability. It ensures that
 * updates to system-critical settings are properly validated, require
 * appropriate authorization, and maintain comprehensive audit logging to
 * prevent accidental platform disruption.
 *
 * Test Workflow:
 *
 * 1. Create moderator account with privileges to modify critical settings
 * 2. Create a system-critical test setting to be modified
 * 3. Update the critical setting with new configuration values
 * 4. Verify the update was successful and maintains proper audit trail
 */
export async function test_api_system_settings_update_critical_setting(
  connection: api.IConnection,
) {
  // 1. Create moderator account with privileges to modify critical settings
  const moderatorCredentials = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    moderation_level: "senior",
  } satisfies IEconomicDiscussionModerator.ICreate;

  const moderator: IEconomicDiscussionModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorCredentials,
    });
  typia.assert(moderator);

  // 2. Create a system-critical test setting to be modified
  const criticalSettingData = {
    setting_key: `platform_stability_${RandomGenerator.alphaNumeric(8)}`,
    setting_value: "120", // 2 minutes timeout
    setting_type: "number",
    display_name: "Platform Session Timeout (Seconds)",
    description:
      "Maximum duration in seconds before user sessions expire for enhanced security on critical operations",
    category: "security",
    is_system_critical: true,
    is_editable: true,
    min_value: "60", // Minimum 1 minute
    max_value: "300", // Maximum 5 minutes
    validation_rules: JSON.stringify({
      type: "number",
      minimum: 60,
      maximum: 300,
      multipleOf: 1,
    }),
  } satisfies IEconomicDiscussionSystemSetting.ICreate;

  const originalSetting: IEconomicDiscussionSystemSetting =
    await api.functional.economicDiscussion.moderator.system_settings.create(
      connection,
      {
        body: criticalSettingData,
      },
    );
  typia.assert(originalSetting);

  // Verify setting was created with correct critical flag and audit information
  TestValidator.predicate(
    "setting was created as system critical",
    originalSetting.is_system_critical === true,
  );
  TestValidator.predicate(
    "setting has audit creation timestamp",
    originalSetting.created_at !== undefined,
  );
  TestValidator.equals(
    "setting matches creation data",
    originalSetting.setting_key,
    criticalSettingData.setting_key,
  );
  TestValidator.equals(
    "setting value matches creation",
    originalSetting.setting_value,
    criticalSettingData.setting_value,
  );

  // 3. Update the critical setting with new configuration values
  const updatedTimeout = "180"; // Updated to 3 minutes
  const settingUpdate = {
    setting_value: updatedTimeout,
    setting_type: "number", // Must be included as it's marked in IUpdate
    category: "security", // Maintaining same category for consistency
    is_system_critical: true, // Preserving critical nature
    description:
      criticalSettingData.description +
      " - Updated for enhanced security protocols",
  } satisfies IEconomicDiscussionSystemSetting.IUpdate;

  const updatedSetting: IEconomicDiscussionSystemSetting =
    await api.functional.economicDiscussion.moderator.system_settings.update(
      connection,
      {
        settingCode: originalSetting.setting_key,
        body: settingUpdate,
      },
    );
  typia.assert(updatedSetting);

  // 4. Verify the update was successful and maintains proper audit trail
  TestValidator.predicate(
    "update changed the setting value",
    updatedSetting.setting_value === updatedTimeout,
  );
  TestValidator.predicate(
    "update preserved system critical flag",
    updatedSetting.is_system_critical === true,
  );
  TestValidator.predicate(
    "update timestamp was recorded",
    updatedSetting.updated_at > originalSetting.updated_at,
  );

  // Verify sigificant change: value from 120 to 180 seconds, description updated
  TestValidator.notEquals(
    "setting value was updated",
    originalSetting.setting_value,
    updatedSetting.setting_value,
  );
  TestValidator.notEquals(
    "description was updated",
    originalSetting.description,
    updatedSetting.description,
  );

  // Verify audit information is properly maintained
  TestValidator.predicate(
    "setting id remains same",
    updatedSetting.id === originalSetting.id,
  );
  TestValidator.predicate(
    "setting key remains same",
    updatedSetting.setting_key === originalSetting.setting_key,
  );
  TestValidator.predicate(
    "creation timestamp preserved",
    updatedSetting.created_at === originalSetting.created_at,
  );

  // Verify the new configuration value is within acceptable bounds
  TestValidator.predicate(
    "updated value within minimum bound",
    parseInt(updatedSetting.setting_value) >= 60,
  );
  TestValidator.predicate(
    "updated value within maximum bound",
    parseInt(updatedSetting.setting_value) <= 300,
  );
}
