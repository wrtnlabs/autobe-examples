import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCatalogConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogConfig";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import type { IShoppingMallFeatureConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFeatureConfig";
import type { IShoppingMallPaymentConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentConfig";
import type { IShoppingMallSecurityConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSecurityConfig";
import type { IShoppingMallShippingConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingConfig";
import { prepare_random_shopping_mall_configuration } from "../../../prepare/prepare_random_shopping_mall_configuration";
import { generate_random_shopping_mall_configurations_create } from "../../../generate/generate_random_shopping_mall_configurations_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_system_configuration_create_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: From authenticated admin connection, create system configuration via utility function
  const config = await generate_random_shopping_mall_configurations_create(
    adminConnection,
    {
      body: {
        key: "payment.gateway.api.url",
        value: "https://api.paymentprovider.com/v1",
      } satisfies IShoppingMallConfiguration.ICreate,
    },
  );
  typia.assert(config);
  // TestValidator.equals(
  //   "configuration key matches",
  //   config.key,
  //   "payment.gateway.api.url",
  // );
  // TestValidator.equals(
  //   "configuration value matches",
  //   config.value,
  //   "https://api.paymentprovider.com/v1",
  // );
  // Step 3: Create non-admin connection and attempt to create configuration (should fail)
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdmin.ILogin,
  });
  await TestValidator.error(
    "non-admin users cannot create configuration",
    async () => {
      await generate_random_shopping_mall_configurations_create(
        userConnection,
        {
          body: {
            key: "feature.toggle.adminpanel",
            value: "true",
          } satisfies IShoppingMallConfiguration.ICreate,
        },
      );
    },
  );
}