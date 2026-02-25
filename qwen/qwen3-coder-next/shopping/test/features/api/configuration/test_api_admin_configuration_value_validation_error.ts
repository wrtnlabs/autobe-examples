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

/**
 * Test configuration value validation error handling.
 * 1. Admin logs in
 * 2. Admin attempts to update configuration with missing configuration_id
 * 3. Admin attempts to update configuration with invalid data types
 * 4. Verify validation errors are returned
 */
export async function test_api_admin_configuration_value_validation_error(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@example.com",
      password: "1234" as const,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Test missing required field (configuration_id)
  await TestValidator.error(
    "missing configuration_id should throw validation error",
    async () => {
      await api.functional.shoppingMall.admin.configuration_values.updateConfiguration(
        adminConnection,
        {
          body: {
            configuration_id: typia.random<string & tags.Format<"uuid">>(),
            value_string: "test value",
          } satisfies IShoppingMallSystemConfigurationValue.IUpdate,
        },
      );
    },
  );
  // 3. Test invalid data types
  const invalidCases = [
    {
      name: "configuration_id with wrong format",
      body: {
        configuration_id: "invalid-uuid",
        value_string: "test",
      } satisfies IShoppingMallSystemConfigurationValue.IUpdate,
    },
    {
      name: "value_integer as string",
      body: {
        configuration_id: typia.random<string & tags.Format<"uuid">>(),
        value_integer: "not a number" as any,
      } satisfies IShoppingMallSystemConfigurationValue.IUpdate,
    },
    {
      name: "value_boolean as string",
      body: {
        configuration_id: typia.random<string & tags.Format<"uuid">>(),
        value_boolean: "not a boolean" as any,
      } satisfies IShoppingMallSystemConfigurationValue.IUpdate,
    },
    {
      name: "value_datetime as string",
      body: {
        configuration_id: typia.random<string & tags.Format<"uuid">>(),
        value_datetime: "not a datetime" as any,
      } satisfies IShoppingMallSystemConfigurationValue.IUpdate,
    },
  ];
  for (const testCase of invalidCases) {
    await TestValidator.error(
      `invalid ${testCase.name} should throw validation error`,
      async () => {
        await api.functional.shoppingMall.admin.configuration_values.updateConfiguration(
          adminConnection,
          { body: testCase.body },
        );
      },
    );
  }
  // 4. Test valid update to ensure endpoint works
  const validUpdate =
    typia.random<IShoppingMallSystemConfigurationValue.IUpdate>();
  const updatedConfig =
    await api.functional.shoppingMall.admin.configuration_values.updateConfiguration(
      adminConnection,
      { body: validUpdate },
    );
  typia.assert(updatedConfig);
}