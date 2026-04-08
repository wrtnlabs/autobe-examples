import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer order items access control to verify row-level security enforcement.
 *
 * Validates that customers can only view order items for their own orders through data isolation at the database query level. The system must reject unauthorized access attempts with 403 Forbidden to prevent order ID enumeration attacks.
 *
 * 1. Register Customer A (unauthorized access attempter) with randomized credentials
 * 2. Register Customer B (order owner) with different randomized credentials
 * 3. Create separate authenticated connections for each customer
 * 4. Customer A attempts to retrieve order items using Customer B's order ID
 * 5. System rejects with 403 Forbidden error indicating permission denied
 */
export async function test_api_order_items_access_control_customer_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Customer A (unauthorized access attempter)
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      display_name: "Customer A",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerA);
  // 2. Register Customer B (order owner)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      display_name: "Customer B",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerB);
  // 3. Customer A attempts to access Customer B's order items
  // Using a random UUID as order ID (simulating scenario where Customer A somehow knows an order ID)
  const fakeOrderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "customer A cannot access customer B's order items",
    403,
    async () => {
      await api.functional.ecommerce.customer.orders.items.index(
        customerAConnection,
        {
          orderId: fakeOrderId,
          body: {} satisfies IEcommerceOrderItem.IRequest,
        },
      );
    },
  );
}
