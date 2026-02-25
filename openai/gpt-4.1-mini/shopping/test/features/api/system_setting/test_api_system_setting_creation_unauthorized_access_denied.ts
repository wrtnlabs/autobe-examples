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
import { generate_random_shopping_mall_administrator_system_settings_create_system_setting } from "../../../generate/generate_random_shopping_mall_administrator_system_settings_create_system_setting";
import { prepare_random_shopping_mall_system_setting } from "../../../prepare/prepare_random_shopping_mall_system_setting";

export async function test_api_system_setting_creation_unauthorized_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that a non-administrator cannot create system settings and should receive authorization error.
  // We do NOT authenticate this connection as administrator, so it is unauthorized for this operation.
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Prepare a random but valid system setting creation body
  const requestBody: IShoppingMallSystemSetting.ICreate = {
    key: `unauthorized_test_${RandomGenerator.alphabets(10)}`,
    value: "unauthorized test value",
    data_type: "string",
    description: "Test unauthorized access rejection",
  };
  // Expect API call to fail with HTTP 401 or 403 error due to lack of admin authorization
  await TestValidator.httpError(
    "unauthorized system setting creation should be denied",
    [401, 403],
    async () => {
      // Use the generate_random function to call system setting creation endpoint via unauthorized connection
      await generate_random_shopping_mall_administrator_system_settings_create_system_setting(
        unauthorizedConnection,
        { body: requestBody },
      );
    },
  );
}
