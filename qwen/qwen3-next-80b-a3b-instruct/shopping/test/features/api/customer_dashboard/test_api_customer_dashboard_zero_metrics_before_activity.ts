import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_dashboard_zero_metrics_before_activity(
  connection: api.IConnection,
): Promise<void> {
  // Create a new customer account to establish clean identity
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // Call the customer dashboard summary endpoint
  const dashboardResult =
    await api.functional.shoppingMall.customer.dashboard.summary(
      customerConnection,
    );
  typia.assert(dashboardResult);
  // Validate that all metrics are zero or null (clean state)
  TestValidator.equals(
    "total_products is zero",
    dashboardResult.total_products,
    0,
  );
  TestValidator.equals("total_orders is zero", dashboardResult.total_orders, 0);
  TestValidator.equals(
    "pending_cancellation_requests is zero",
    dashboardResult.pending_cancellation_requests,
    0,
  );
  TestValidator.equals(
    "pending_refund_requests is zero",
    dashboardResult.pending_refund_requests,
    0,
  );
}
