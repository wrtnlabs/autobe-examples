import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Blocks cross-order customer order-item access.
 *
 * Verifies that an authenticated customer cannot access an order item that is not owned by that customer. The endpoint must not reveal whether the foreign order item exists and should instead fail with a not-found style or authorization-style HTTP error.
 *
 * Because the available test utilities do not provide a workflow for creating two separate customer orders and extracting a foreign order item, this test uses valid customer authentication and foreign UUID targets to validate the visibility boundary without exposing cross-order data.
 *
 * 1. Registers and authenticates a customer session.
 * 2. Requests a foreign orderId/orderItemId pair outside the customer's scope.
 * 3. Confirms the API rejects the lookup with a not-found or authorization failure.
 */
export async function test_api_customer_order_item_cross_order_visibility_blocked(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const foreignOrderId = typia.random<string & tags.Format<"uuid">>();
  const foreignOrderItemId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "cross-order order item access should be blocked",
    [401, 403, 404],
    async () => {
      await api.functional.mallPlatform.customer.orders.orderItems.at(
        customerConnection,
        {
          orderId: foreignOrderId,
          orderItemId: foreignOrderItemId,
        },
      );
    },
  );
}
