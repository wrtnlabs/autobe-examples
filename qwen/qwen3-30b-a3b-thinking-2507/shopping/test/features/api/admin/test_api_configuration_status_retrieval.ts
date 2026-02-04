import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_configuration_status_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create new connection for admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Use utility function to create new admin user with a valid email pattern
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: `${RandomGenerator.name(1)}@test.com`,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Retrieve configuration status using authenticated admin connection
  const config =
    await api.functional.shoppingMall.admin.configurations.status.at(
      adminConnection,
    );
  // Validate response structure with typia.assert
  typia.assert(config);
  // Validate essential metrics types
  TestValidator.equals(
    "trendingProducts should be a number",
    typeof config.trendingProducts,
    "number",
  );
  TestValidator.equals(
    "totalSales should be a number",
    typeof config.totalSales,
    "number",
  );
  TestValidator.equals(
    "totalProducts should be a number",
    typeof config.totalProducts,
    "number",
  );
  TestValidator.equals(
    "totalCustomers should be a number",
    typeof config.totalCustomers,
    "number",
  );
}
