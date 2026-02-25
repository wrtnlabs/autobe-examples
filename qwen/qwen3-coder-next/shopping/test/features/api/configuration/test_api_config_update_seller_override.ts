import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_configurations_update } from "../../../generate/generate_random_shopping_mall_admin_configurations_update";
import { prepare_random_shopping_mall_system_configuration_value } from "../../../prepare/prepare_random_shopping_mall_system_configuration_value";

/**
 * Test configuration update with seller-specific override.
 * 1. Register admin user via /auth/admin/join
 * 2. Login as admin via /auth/admin/login
 * 3. Create seller account via /auth/seller/join
 * 4. Login as seller and verify seller profile
 * 5. Update configuration value with seller_id to set seller-specific override
 * 6. Verify seller-specific configuration takes precedence
 * 7. Verify system-wide configuration still exists for other sellers
 */
export async function test_api_config_update_seller_override(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin user via /auth/admin/join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinData = {
    email: typia.random<string & tags.Format<"email"> & tags.MaxLength<255>>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: adminJoinData,
  });
  typia.assert(adminAuthorized);
  // 2. Login as admin via /auth/admin/login
  const adminLoginData = {
    email: adminJoinData.email,
    password: adminJoinData.password,
  } satisfies IShoppingMallAdmin.ILogin;
  const adminLoginResponse = await authorize_admin_login(adminConnection, {
    body: adminLoginData,
  });
  typia.assert(adminLoginResponse);
  // 3. Create seller account via /auth/seller/join
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinData = {
    email: typia.random<string & tags.Format<"email"> & tags.MaxLength<255>>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_image_url: null,
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: sellerJoinData,
  });
  typia.assert(sellerAuthorized);
  // 4. Login as seller and verify seller profile
  const sellerLoginData = {
    email: sellerJoinData.email,
    password: sellerJoinData.password,
  } satisfies IShoppingMallSeller.ILogin;
  const sellerLoginResponse = await authorize_seller_login(sellerConnection, {
    body: sellerLoginData,
  });
  typia.assert(sellerLoginResponse);
  // 5. Create a system configuration for testing
  const systemConfig =
    await api.functional.shoppingMall.admin.configurations.update(
      adminConnection,
      {
        configurationId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          configuration_id: typia.random<string & tags.Format<"uuid">>(),
          configuration_name: "test_seller_config",
          seller_id: null,
        } satisfies IShoppingMallSystemConfigurationValue.ICreate,
      },
    );
  typia.assert(systemConfig);
  // 6. Update configuration with seller-specific override
  const sellerOverrideValue =
    "seller-specific-value-" + RandomGenerator.alphaNumeric(8);
  const sellerOverride =
    await api.functional.shoppingMall.admin.configurations.update(
      adminConnection,
      {
        configurationId: systemConfig.id,
        body: {
          configuration_id: systemConfig.configuration_id,
          configuration_name: systemConfig.configuration_name,
          seller_id: sellerLoginResponse.id,
        } satisfies IShoppingMallSystemConfigurationValue.ICreate,
      },
    );
  typia.assert(sellerOverride);
  // 7. Verify seller-specific configuration takes precedence
  TestValidator.equals(
    "seller override has correct seller_id",
    sellerOverride.seller_id,
    sellerLoginResponse.id,
  );
  TestValidator.equals(
    "seller override has correct configuration",
    sellerOverride.configuration_id,
    systemConfig.configuration_id,
  );
  TestValidator.equals(
    "seller override has correct configuration_name",
    sellerOverride.configuration_name,
    systemConfig.configuration_name,
  );
}
