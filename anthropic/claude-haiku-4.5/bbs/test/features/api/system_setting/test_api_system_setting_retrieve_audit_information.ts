import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";

export async function test_api_system_setting_retrieve_audit_information(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  const moderatorAuth: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: moderatorPassword,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderatorAuth);

  // Step 2: Retrieve a system setting with audit information
  const settingKey = "maintenance_mode";
  const setting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.moderator.systemSettings.at(
      connection,
      {
        settingKey: settingKey,
      },
    );
  typia.assert(setting);

  // Step 3: Validate audit trail information exists
  TestValidator.predicate(
    "setting should have updated_at timestamp",
    setting.updatedAt !== null && setting.updatedAt !== undefined,
  );

  TestValidator.predicate(
    "setting should have updated_by identifier",
    setting.updatedBy !== null && setting.updatedBy !== undefined,
  );

  // Step 4: Validate updated_at is a valid ISO 8601 date-time format
  TestValidator.predicate(
    "updated_at should be valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/.test(
      setting.updatedAt,
    ),
  );

  // Step 5: Validate updated_by is a non-empty string
  const updatedBy = setting.updatedBy ?? "";
  TestValidator.predicate(
    "updated_by should be non-empty string",
    updatedBy.length > 0,
  );

  // Step 6: Verify essential setting fields
  TestValidator.equals(
    "setting id should be valid UUID",
    typeof setting.id,
    "string",
  );

  TestValidator.equals(
    "setting key should match requested key",
    setting.settingKey,
    settingKey,
  );

  TestValidator.predicate(
    "setting value should exist",
    setting.settingValue !== null && setting.settingValue !== undefined,
  );

  TestValidator.predicate(
    "setting type should be valid",
    ["string", "integer", "boolean", "json"].includes(setting.settingType),
  );

  // Step 7: Verify timestamps are in valid ISO 8601 format
  TestValidator.predicate(
    "created_at should be valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/.test(
      setting.createdAt,
    ),
  );

  // Step 8: Verify temporal consistency of audit timestamps
  TestValidator.predicate(
    "created_at should be before or equal to updated_at",
    new Date(setting.createdAt) <= new Date(setting.updatedAt),
  );
}
