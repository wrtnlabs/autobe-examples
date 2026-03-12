import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_customer_analytics_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test customer analytics retrieval success path.
   * 1. Admin authenticates via join endpoint
   * 2. Retrieve customer analytics data
   * 3. Validate response structure and non-negative values
   */
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Retrieve customer analytics
  const analytics =
    await api.functional.shoppingMall.admin.analytics.customers.at(
      adminConnection,
    );
  typia.assert(analytics);
  // Validate all numeric fields are non-negative
  TestValidator.predicate(
    "totalCustomers is non-negative",
    analytics.totalCustomers >= 0,
  );
  TestValidator.predicate(
    "activeCustomers is non-negative",
    analytics.activeCustomers >= 0,
  );
  TestValidator.predicate(
    "suspendedCustomers is non-negative",
    analytics.suspendedCustomers >= 0,
  );
  TestValidator.predicate(
    "bannedCustomers is non-negative",
    analytics.bannedCustomers >= 0,
  );
  TestValidator.predicate(
    "newCustomersLast30Days is non-negative",
    analytics.newCustomersLast30Days >= 0,
  );
  TestValidator.predicate(
    "totalOrders is non-negative",
    analytics.totalOrders >= 0,
  );
  TestValidator.predicate(
    "averageOrderValue is non-negative",
    analytics.averageOrderValue >= 0,
  );
  TestValidator.predicate(
    "totalRevenue is non-negative",
    analytics.totalRevenue >= 0,
  );
  TestValidator.predicate(
    "averageOrdersPerActiveCustomer is non-negative",
    analytics.averageOrdersPerActiveCustomer >= 0,
  );
  // Validate new customers is less than or equal to total customers
  TestValidator.predicate(
    "newCustomersLast30Days does not exceed totalCustomers",
    analytics.newCustomersLast30Days <= analytics.totalCustomers,
  );
}
