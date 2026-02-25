import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_bulk_product_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate admin credentials for registration
  const adminEmail = `admin_bulk_delete_${RandomGenerator.alphaNumeric(6)}@test.com`;
  // Register new admin account
  const adminJoinResponse = await api.functional.shoppingMall.auth.admin.join(
    adminConnection,
    {
      body: {
        email: adminEmail,
        password: "Admin123!" satisfies string & tags.Format<"password">,
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(adminJoinResponse);
  // Create new connection with authentication token from join
  const authenticatedAdminConnection: api.IConnection = {
    host: adminConnection.host,
    headers: {
      Authorization: adminJoinResponse.token.access,
    },
  };
  // Login with admin credentials
  const adminLoginResponse = await api.functional.shoppingMall.auth.admin.login(
    authenticatedAdminConnection,
    {
      body: {
        email: adminEmail,
        password: "Admin123!" satisfies string & tags.Format<"password">,
      } satisfies IShoppingMallAdmin.ILogin,
    },
  );
  typia.assert(adminLoginResponse);
  // Update connection with login token
  const finalAdminConnection: api.IConnection = {
    host: adminLoginResponse.token.access
      ? adminConnection.host
      : authenticatedAdminConnection.host,
    headers: {
      Authorization: adminLoginResponse.token.access,
    },
  };
  // Test bulk delete with empty product list (edge case - no products to delete)
  const emptyDeleteResponse =
    await api.functional.shoppingMall.admin.admin.products.bulk_delete.bulkDelete(
      finalAdminConnection,
      {
        body: {
          date: new Date().toISOString().split("T")[0],
          total_sales_amount: 0,
          order_count: 0,
        } satisfies IShoppingMallSystemConfiguration,
      },
    );
  typia.assert(emptyDeleteResponse);
  // Test bulk delete with valid configuration data
  const configResponse =
    await api.functional.shoppingMall.admin.admin.products.bulk_delete.bulkDelete(
      finalAdminConnection,
      {
        body: {
          date: new Date().toISOString().split("T")[0],
          total_sales_amount: 100000,
          order_count: 25,
        } satisfies IShoppingMallSystemConfiguration,
      },
    );
  typia.assert(configResponse);
  // Validate response structure
  TestValidator.equals(
    "response date format",
    typeof configResponse.date,
    "string",
  );
  TestValidator.predicate(
    "total sales positive",
    configResponse.total_sales_amount >= 0,
  );
  TestValidator.predicate(
    "order count non-negative",
    configResponse.order_count >= 0,
  );
}
