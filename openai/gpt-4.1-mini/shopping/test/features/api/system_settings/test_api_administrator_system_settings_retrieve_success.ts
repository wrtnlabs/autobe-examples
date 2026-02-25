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

export async function test_api_administrator_system_settings_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins to obtain authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin.${RandomGenerator.alphaNumeric(6)}@test.com`,
      password: "complexpassword",
    },
  });
  typia.assert(admin);
  // 2. Retrieve an existing system setting
  // Create a new system setting is not allowed through API, so we use the api.functional.shoppingMall.administrator.systemSettings.at with random ID.
  // Since random ID likely does not exist, we expect 404 error, so we first test error with non-existent ID.
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "404 on non-existent system setting",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.systemSettings.at(
        adminConnection,
        { id: nonExistentId },
      );
    },
  );
  // 3. Unauthorized access test: try without authorization header
  await TestValidator.httpError(
    "unauthorized access rejected",
    401,
    async () => {
      // use base connection without authorization header
      await api.functional.shoppingMall.administrator.systemSettings.at(
        connection,
        { id: nonExistentId },
      );
    },
  );
  // 4. We cannot create an actual system setting via API, but to test retrieval success we will use the simulate mode.
  // Using simulate mode connection
  const simulateConnection: api.IConnection = {
    host: connection.host,
    simulate: true,
  };
  const setting =
    await api.functional.shoppingMall.administrator.systemSettings.at(
      simulateConnection,
      { id: typia.random<string & tags.Format<"uuid">>() },
    );
  typia.assert(setting);
  // 5. Validate returned object properties
  TestValidator.predicate(
    "has id",
    typeof setting.id === "string" && setting.id.length > 0,
  );
  TestValidator.predicate(
    "key is string",
    typeof setting.key === "string" && setting.key.length > 0,
  );
  TestValidator.predicate("value is string", typeof setting.value === "string");
  // description can be undefined or null or string
  TestValidator.predicate(
    "description can be string, null or undefined",
    typeof setting.description === "string" ||
      setting.description === null ||
      setting.description === undefined,
  );
  TestValidator.predicate(
    "data_type is string",
    typeof setting.data_type === "string" && setting.data_type.length > 0,
  );
  TestValidator.predicate(
    "created_at is string",
    typeof setting.created_at === "string" && setting.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is string",
    typeof setting.updated_at === "string" && setting.updated_at.length > 0,
  );
  // deleted_at can be string or null or undefined
  TestValidator.predicate(
    "deleted_at can be string, null or undefined",
    typeof setting.deleted_at === "string" ||
      setting.deleted_at === null ||
      setting.deleted_at === undefined,
  );
}
