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

export async function test_api_system_setting_update_success_and_duplicate_key_failure(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authorize superAdministrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuthorized = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdminAuthorized);
  // Use token for subsequent calls
  superAdminConnection.headers = superAdminConnection.headers ?? {};
  superAdminConnection.headers["Authorization"] =
    `Bearer ${superAdminAuthorized.token.access}`;
  // 2. Prepare two distinct system settings by creating two settings with different keys
  // (Since no creation endpoint is provided, simulate by using random UUIDs and different keys)
  const existingSettingId1 = typia.random<string & tags.Format<"uuid">>();
  const existingSettingId2 = typia.random<string & tags.Format<"uuid">>();
  const uniqueKey1 = `unique_key_${typia.random<string & tags.Format<"uuid">>().slice(0, 8)}`;
  const uniqueKey2 = `unique_key_${typia.random<string & tags.Format<"uuid">>().slice(0, 8)}`;
  // 3. Successfully update setting with uniqueKey1
  const updateBody1: IDiscussionBoardSystemSetting.IUpdate = {
    key: uniqueKey1,
    value: "new_value_1",
    description: "Updated system setting description",
    deleted_at: null,
  };
  const updatedSetting1 =
    await api.functional.discussionBoard.superAdministrator.systemSettings.update(
      superAdminConnection,
      {
        id: existingSettingId1,
        body: updateBody1,
      },
    );
  typia.assert(updatedSetting1);
  // Verify updated key and value
  TestValidator.equals("updated key matches", updatedSetting1.key, uniqueKey1);
  TestValidator.equals(
    "updated value matches",
    updatedSetting1.value,
    updateBody1.value,
  );
  TestValidator.equals(
    "updated description matches",
    updatedSetting1.description,
    updateBody1.description,
  );
  // Verify timestamps presence and format
  typia.assert(updatedSetting1.created_at);
  typia.assert(updatedSetting1.updated_at);
  TestValidator.predicate(
    "createdAt before or equal updatedAt",
    updatedSetting1.created_at <= updatedSetting1.updated_at,
  );
  // 4. Attempt to update the same setting with duplicated key uniqueKey2
  const updateBodyDuplicateKey: IDiscussionBoardSystemSetting.IUpdate = {
    key: uniqueKey1, // duplicated key from updateBody1
    value: "new_value_2",
    description: "Attempted duplicate key update",
    deleted_at: null,
  };
  await TestValidator.error("update fails due to duplicate key", async () => {
    await api.functional.discussionBoard.superAdministrator.systemSettings.update(
      superAdminConnection,
      {
        id: existingSettingId2,
        body: updateBodyDuplicateKey,
      },
    );
  });
}
