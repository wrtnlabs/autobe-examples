import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSystematicConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicConfig";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_config_unauthorized_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create non-admin customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Create regular admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 3. Test unauthorized access - customer cannot update configs
  const invalidConfigBody = {
    config_key: "shipping_fee",
    value: JSON.stringify({ base: 3000, threshold: 50000 }),
    type: "object",
    description: "Test configuration update",
    enabled: true,
  } satisfies IShoppingMallSystematicConfig.IUpdate;
  await TestValidator.error("customer cannot update configs", async () => {
    await api.functional.shoppingMall.admin.configs.patch(customerConnection, {
      body: invalidConfigBody,
    });
  });
  // 4. Test invalid configuration key
  const invalidKeyBody = {
    config_key: "non_existent_key_12345",
    value: JSON.stringify({ test: true }),
    type: "object",
    description: "Invalid config key test",
    enabled: true,
  } satisfies IShoppingMallSystematicConfig.IUpdate;
  await TestValidator.error("invalid config key rejected", async () => {
    await api.functional.shoppingMall.admin.configs.patch(adminConnection, {
      body: invalidKeyBody,
    });
  });
  // 5. Test invalid configuration value format
  const invalidFormatBody = {
    config_key: "refund_window",
    value: "not_a_valid_json_object",
    type: "object",
    description: "Invalid format test",
    enabled: true,
  } satisfies IShoppingMallSystematicConfig.IUpdate;
  await TestValidator.error(
    "invalid config value format rejected",
    async () => {
      await api.functional.shoppingMall.admin.configs.patch(adminConnection, {
        body: invalidFormatBody,
      });
    },
  );
  // 6. Test successful configuration update by authorized admin
  const validBody = {
    config_key: "shipping_fee",
    value: JSON.stringify({ base: 5000, threshold: 70000 }),
    type: "object",
    description: "Updated shipping fee config",
    enabled: true,
  } satisfies IShoppingMallSystematicConfig.IUpdate;
  const result = await api.functional.shoppingMall.admin.configs.patch(
    adminConnection,
    {
      body: validBody,
    },
  );
  typia.assert(result);
  // 7. Verify the configuration was actually updated
  TestValidator.equals("config key matches", (result as any).config_key, "shipping_fee");
  TestValidator.predicate(
    "value is updated object",
    typeof (result as any).value === "object" && (result as any).value !== null,
  );
}