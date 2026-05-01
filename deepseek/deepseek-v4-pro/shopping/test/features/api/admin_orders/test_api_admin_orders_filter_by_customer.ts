import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator order filtering by customer ID.
 *
 * Validates that administrators can browse orders belonging to a specific
 * customer using the admin-exclusive customerId filter. This cross-customer
 * visibility is a privilege unique to administrators — customer actors are
 * automatically scoped to their own orders, and seller actors see only orders
 * containing their products.
 *
 * The test authenticates as an administrator, sends a request with a randomly
 * generated customer UUID, and verifies that every order in the response
 * belongs to the specified customer by matching each order's customer.id
 * against the requested customerId.
 *
 * 1. Administrator registers and authenticates via the join endpoint.
 * 2. A random valid customer UUID is generated as the filter target.
 * 3. The admin orders endpoint is called with the customerId filter.
 * 4. The response is validated with typia.assert for structural integrity.
 * 5. Each returned order's customer.id is verified to match the filter value.
 */
export async function test_api_admin_orders_filter_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Generate a random valid customer UUID to filter by
  const customerId: string = typia.random<string & tags.Format<"uuid">>();
  // 3. Call the admin orders endpoint with customerId filter
  const response: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.admin.orders.index(adminConnection, {
      body: {
        customerId,
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(response);
  // 4. Verify every returned order belongs to the specified customer
  for (const order of response.data) {
    TestValidator.equals(
      "order belongs to filtered customer",
      order.customer.id,
      customerId,
    );
  }
}
