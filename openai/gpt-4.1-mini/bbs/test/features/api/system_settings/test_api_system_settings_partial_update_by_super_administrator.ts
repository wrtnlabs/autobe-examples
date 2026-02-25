import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_system_settings_partial_update_by_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super administrator and authorize
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Passw0rd!",
        href: "https://example.com/join",
        referrer: "https://referrer.example.com",
        ip: null,
      },
    },
  );
  // Set super administrator connection with auth token
  superAdminConnection.headers ??= {};
  superAdminConnection.headers.Authorization = `Bearer ${superAdmin.token.access}`;
  // Step 2: Get initial full settings to compare after update
  // As there is no GET endpoint mentioned, we simulate by doing a full update with no changes
  // or rely on partial update response for comparison
  // Step 3: Patch partial update with only 'value' field
  const partialValueUpdate: IDiscussionBoardSystemSetting.IUpdate = {
    value: RandomGenerator.alphaNumeric(10),
  };
  const updatedSettingValue =
    await api.functional.discussionBoard.superAdministrator.systemSettings.updateSettings(
      superAdminConnection,
      { body: partialValueUpdate },
    );
  typia.assert(updatedSettingValue);
  TestValidator.equals(
    "updated value matches",
    updatedSettingValue.value,
    partialValueUpdate.value,
  );
  // Step 4: Patch partial update with only 'description' field
  const partialDescriptionUpdate: IDiscussionBoardSystemSetting.IUpdate = {
    description: RandomGenerator.paragraph({ sentences: 2 }),
  };
  const updatedSettingDescription =
    await api.functional.discussionBoard.superAdministrator.systemSettings.updateSettings(
      superAdminConnection,
      { body: partialDescriptionUpdate },
    );
  typia.assert(updatedSettingDescription);
  TestValidator.equals(
    "updated description matches",
    updatedSettingDescription.description,
    partialDescriptionUpdate.description,
  );
  // Step 5: Patch partial update with both 'value' and 'description' fields
  const partialFullUpdate: IDiscussionBoardSystemSetting.IUpdate = {
    value: RandomGenerator.alphaNumeric(15),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  };
  const updatedSettingFull =
    await api.functional.discussionBoard.superAdministrator.systemSettings.updateSettings(
      superAdminConnection,
      { body: partialFullUpdate },
    );
  typia.assert(updatedSettingFull);
  TestValidator.equals(
    "updated full value matches",
    updatedSettingFull.value,
    partialFullUpdate.value,
  );
  TestValidator.equals(
    "updated full description matches",
    updatedSettingFull.description,
    partialFullUpdate.description,
  );
  // Step 6: Patch partial update with soft-delete timestamp
  const now = new Date().toISOString();
  const partialDeleteUpdate: IDiscussionBoardSystemSetting.IUpdate = {
    deleted_at: now,
  };
  const updatedSettingDelete =
    await api.functional.discussionBoard.superAdministrator.systemSettings.updateSettings(
      superAdminConnection,
      { body: partialDeleteUpdate },
    );
  typia.assert(updatedSettingDelete);
  TestValidator.equals(
    "soft delete timestamp matches",
    updatedSettingDelete.deleted_at,
    partialDeleteUpdate.deleted_at,
  );
}
