import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import type { IShoppingMallSystematicConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicConfig";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_shopping_mall_super_admin_configs_configure } from "../../../generate/generate_random_shopping_mall_super_admin_configs_configure";
import { prepare_random_shopping_mall_systematic_config } from "../../../prepare/prepare_random_shopping_mall_systematic_config";

export async function test_api_super_admin_reject_invalid_configuration_key_format(
  connection: api.IConnection,
): Promise<void> {
  // 1. Login as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const adminBody = typia.random<IShoppingMallSuperAdmin.IJoin>();
  const loginResponse = await api.functional.shoppingMall.auth.super_admin.join(
    superAdminConnection,
    {
      body: adminBody,
    },
  );
  typia.assert(loginResponse);
  // 2. Create actor-specific connection with authentication token
  const authConnection: api.IConnection = {
    host: connection.host,
    headers: {
      authorization: loginResponse.token.access,
    },
  };
  // 3. Try to configure with invalid key format (should fail)
  const invalidKeys = [
    "invalid-key", // contains hyphen
    "key with spaces", // contains spaces
    "123numeric", // starts with number
    "invalid.key.format!", // contains special character
    "UPPERCASE", // contains uppercase letters
  ];
  for (const invalidKey of invalidKeys) {
    const invalidConfig = {
      key: invalidKey,
      value: JSON.stringify({ test: "value" }),
      description: "Test configuration with invalid key",
    };
    await TestValidator.error("should reject invalid key format", async () => {
      await api.functional.shoppingMall.superAdmin.configs.configure(
        authConnection,
        {
          body: invalidConfig,
        },
      );
    });
  }
  // 4. Verify valid key format still works (sanity check)
  const validConfig = {
    key: "shipping.base_fee",
    value: JSON.stringify({ amount: 5000 }),
    description: "Valid configuration",
  };
  const result = await api.functional.shoppingMall.superAdmin.configs.configure(
    authConnection,
    {
      body: validConfig,
    },
  );
  typia.assert(result);
}
