import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_items_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: "https://test.example.com/orders",
      referrer: "https://test.example.com",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Generate a test order ID (simulated)
  const orderId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test filtering by 'paid' status
  const paidItems =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId,
        body: {
          status: "paid",
          limit: 10,
          page: 1,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(paidItems);
  // 4. Validate pagination structure
  TestValidator.predicate(
    "pagination has current page",
    paidItems.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    paidItems.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records",
    paidItems.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    paidItems.pagination.pages >= 0,
  );
  // 5. Validate all returned items have 'paid' status (if any exist)
  for (const item of paidItems.data) {
    TestValidator.equals("item status is paid", item.status, "paid");
  }
  // 6. Test filtering by 'shipped' status
  const shippedItems =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId,
        body: {
          status: "shipped",
          limit: 10,
          page: 1,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(shippedItems);
  // 7. Validate all shipped items have correct status
  for (const item of shippedItems.data) {
    TestValidator.equals("item status is shipped", item.status, "shipped");
    // Shipped items should have shipment reference populated
    if (item.shipment !== null) {
      TestValidator.predicate(
        "shipment has carrier name",
        item.shipment.carrierName.length > 0,
      );
      TestValidator.predicate(
        "shipment has tracking number",
        item.shipment.trackingNumber.length > 0,
      );
    }
  }
  // 8. Test filtering by 'delivered' status
  const deliveredItems =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId,
        body: {
          status: "delivered",
          limit: 10,
          page: 1,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(deliveredItems);
  // 9. Validate all delivered items have correct status
  for (const item of deliveredItems.data) {
    TestValidator.equals("item status is delivered", item.status, "delivered");
    // Delivered items should have shipment with deliveredAt
    if (item.shipment !== null) {
      TestValidator.predicate(
        "delivered item has delivery status",
        item.shipment.deliveryStatus === "delivered",
      );
    }
  }
  // 10. Test pagination with status filter
  const paginatedItems =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId,
        body: {
          status: "paid",
          limit: 2,
          page: 1,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(paginatedItems);
  // 11. Validate pagination limit is respected
  TestValidator.predicate(
    "page limit respected",
    paginatedItems.data.length <= 2,
  );
}
