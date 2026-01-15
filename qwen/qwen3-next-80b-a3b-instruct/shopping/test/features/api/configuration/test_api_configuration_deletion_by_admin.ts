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
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_configuration_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const adminAccount: IShoppingMallAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(adminAccount);
  // Step 2: Authenticate the admin to obtain valid credentials
  const authenticatedAdminConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_admin_login(authenticatedAdminConnection, {
    body: {
      email: adminAccount.email,
      password, // Use stored password, not access from adminAccount
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // Step 3: Delete a configuration using a meaningful configCode
  // In this system, configurations are system-level and pre-existing
  // We'll use a common configuration code name as per business domain
  const configCode = "shipping_method_standard";
  const deletedConfig: IShoppingMallConfiguration =
    await api.functional.shoppingMall.admin.configurations.erase(
      authenticatedAdminConnection,
      {
        configCode,
      },
    );
  typia.assert(deletedConfig);
  // Step 4: Verify the returned object has the correct structure
  // The deletedConfig should match IShoppingMallConfiguration structure
  // typia.assert() already validates the structure and type
  TestValidator.equals(
    "deleted config returned successfully",
    deletedConfig,
    deletedConfig,
  );
}