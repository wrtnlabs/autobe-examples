import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_system_setting_update_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins (registers) to obtain authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongPass1234",
    },
  });
  // Attach the authorization token to adminConnection
  adminConnection.headers = { Authorization: `Bearer ${admin.token.access}` };
  // 2. Prepare update payload for system setting conforming to IUpdate schema
  const updatePayload: IShoppingMallSystemSetting.IUpdate = {
    key: `test_key_${RandomGenerator.alphabets(5)}`,
    value: `test_value_${RandomGenerator.alphabets(10)}`,
    description: `Test description ${RandomGenerator.paragraph({ sentences: 1 })}`,
    data_type: "string",
  };
  // 3. Create initial system setting (simulate) by invoking update with a random id to create a setting
  // Since no creation API is provided, we assume update with a new id creates or updates.
  // Generate random UUID for system setting id to update
  const systemSettingId = typia.random<string & tags.Format<"uuid">>();
  // 4. Perform update operation
  const updatedSetting =
    await api.functional.shoppingMall.administrator.systemSettings.update(
      adminConnection,
      {
        id: systemSettingId,
        body: updatePayload,
      },
    );
  // 5. Assert the response is a valid system setting data with all required fields
  typia.assert(updatedSetting);
  // 6. Verify that returned data matches the update payload key, value, description, and data type
  TestValidator.equals(
    "updated key matches",
    updatedSetting.key,
    updatePayload.key,
  );
  TestValidator.equals(
    "updated value matches",
    updatedSetting.value,
    updatePayload.value,
  );
  TestValidator.equals(
    "updated description matches",
    updatedSetting.description,
    updatePayload.description,
  );
  TestValidator.equals(
    "updated data type matches",
    updatedSetting.data_type,
    updatePayload.data_type,
  );
  // 7. Verify timestamps exist and are valid ISO date-time strings
  TestValidator.predicate(
    "createdAt is ISO date-time",
    typeof updatedSetting.created_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T/.test(updatedSetting.created_at),
  );
  TestValidator.predicate(
    "updatedAt is ISO date-time",
    typeof updatedSetting.updated_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T/.test(updatedSetting.updated_at),
  );
  // 8. Check deleted_at is null or ISO date-time string
  TestValidator.predicate(
    "deletedAt is null or ISO date-time",
    updatedSetting.deleted_at === null ||
      typeof updatedSetting.deleted_at === "string",
  );
  // 9. (Optional) Further verification steps would include fetching audit logs and database checks
  // But those are not accessible in this E2E test
}
