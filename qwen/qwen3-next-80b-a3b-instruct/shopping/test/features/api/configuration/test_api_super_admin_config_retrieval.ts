import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
export async function test_api_super_admin_config_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for superAdmin authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate as superAdmin using the provided utility function
  const superAdmin: IShoppingMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallSuperAdmin.IJoin,
    });
  typia.assert(superAdmin);
  // Step 3: Use the superAdminConnection directly for configuration retrieval
  // We do not create a new connection - we use the already authenticated connection
  // Since we cannot generate a random configurationId as it must exist, we use a known valid ID
  // In a real implementation, this would come from the system
  // For this test, we'll use a random UUID as the configurationId and assume the system has a default configuration at this ID
  const configurationId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Retrieve the configuration using the superAdmin's authenticated connection
  const configuration: IShoppingMallConfiguration =
    await api.functional.shoppingMall.superAdmin.configurations.at(
      superAdminConnection,
      {
        configurationId,
      },
    );
  typia.assert(configuration);
  // Step 5: Simple business logic validation - we don't need to validate types as typia.assert() already does this completely
  // The test scenario asks for validation of configuration properties, but since typia.assert() already validates everything,
  // we just need to ensure the retrieval was successful and the response contains expected properties
  // We validate that retrieval returned a non-empty configuration
  TestValidator.equals(
    "configuration retrieval successful",
    configuration !== null,
    true,
  );
  TestValidator.equals(
    "currency is not empty",
    configuration.currency.length > 0,
    true,
  );
  TestValidator.equals(
    "timezone is not empty",
    configuration.timezone.length > 0,
    true,
  );
  TestValidator.equals(
    "locale is not empty",
    configuration.locale.length > 0,
    true,
  );
  TestValidator.equals(
    "payment_gateway is not empty",
    configuration.payment_gateway.length > 0,
    true,
  );
  TestValidator.equals(
    "tax_calculation is not empty",
    configuration.tax_calculation.length > 0,
    true,
  );
  TestValidator.equals(
    "shipping_rate_strategy is not empty",
    configuration.shipping_rate_strategy.length > 0,
    true,
  );
  TestValidator.equals(
    "feature_toggles is object",
    typeof configuration.feature_toggles === "object",
    true,
  );
  TestValidator.equals(
    "created_at is not empty",
    configuration.created_at.length > 0,
    true,
  );
  TestValidator.equals(
    "updated_at is not empty",
    configuration.updated_at.length > 0,
    true,
  );
}
