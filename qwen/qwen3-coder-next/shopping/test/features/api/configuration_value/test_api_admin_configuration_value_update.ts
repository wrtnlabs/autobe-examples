import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfiguration";
import type { IShoppingMallSystemConfigurationValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfigurationValue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_configuration_value_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" satisfies string & tags.Format<"password">,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Prepare update data with proper UUID type
  const configurationId = typia.random<string & tags.Format<"uuid">>();
  const testValue = RandomGenerator.name();
  // 3. Update configuration value
  const updatedValue =
    await api.functional.shoppingMall.admin.configuration_values.updateConfiguration(
      adminConnection,
      {
        body: {
          configuration_id: configurationId,
          value_string: testValue,
        } satisfies IShoppingMallSystemConfigurationValue.IUpdate,
      },
    );
  typia.assert(updatedValue);
  // 4. Validate the update
  TestValidator.equals(
    "configuration_id matches",
    updatedValue.configuration_id,
    configurationId,
  );
  TestValidator.equals(
    "value_string matches",
    updatedValue.value_string,
    testValue,
  );
  TestValidator.equals("is_active is true", updatedValue.is_active, true);
}
