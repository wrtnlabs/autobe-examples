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
 * Retrieve an owned customer order item and validate its live detail response.
 *
 * Verifies that an authenticated customer can request a specific order item from the customer order-history API and receive the live operational record for that item. The test validates the returned item identity, quantity, status, timestamps, and nested relations for the parent order, purchased variant, and seller summary.
 *
 * Because the available test materials do not provide an order creation endpoint, the scenario is adapted to exercise the retrieval contract directly with UUID path parameters while still ensuring the customer-authenticated access path and response typing are correct.
 *
 * 1. Register and authenticate a customer account using the provided join utility.
 * 2. Call the customer order-item retrieval endpoint with UUID order and item identifiers.
 * 3. Validate the response shape and confirm the returned order relation matches the requested order id.
 */
export async function test_api_customer_order_item_retrieve_own_item(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/mallPlatform/customer/orders",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const orderItem =
    await api.functional.mallPlatform.customer.orders.orderItems.at(
      customerConnection,
      {
        orderId,
        orderItemId,
      },
    );
  typia.assert(orderItem);
  TestValidator.equals(
    "order item id matches the requested item id",
    orderItem.id,
    orderItemId,
  );
  TestValidator.equals(
    "parent order id matches the requested order id",
    orderItem.order.id,
    orderId,
  );
  TestValidator.predicate(
    "quantity is a positive integer",
    orderItem.quantity > 0,
  );
  TestValidator.predicate("status is present", orderItem.status.length > 0);
  TestValidator.predicate(
    "created timestamp is present",
    orderItem.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated timestamp is present",
    orderItem.updated_at.length > 0,
  );
  TestValidator.predicate(
    "product variant relation exists",
    orderItem.productVariant.id.length > 0,
  );
  TestValidator.predicate(
    "seller relation exists",
    orderItem.seller.id.length > 0,
  );
}
