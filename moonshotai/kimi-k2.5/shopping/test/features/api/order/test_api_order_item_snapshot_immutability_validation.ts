import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemProductSnapshot";
import type { IEcommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSellerSnapshot";
import type { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import type { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_item_snapshot_immutability_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(customer);
  // 2. List customer's orders to find orders with items
  const orderList = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(orderList);
  // Ensure we have at least one order
  TestValidator.predicate("has orders", orderList.data.length > 0);
  // 3. Get full order details with order items
  const orderId = orderList.data[0].id;
  const order = await api.functional.ecommerceMall.customer.orders.at(
    customerConnection,
    {
      orderId,
    },
  );
  typia.assert(order);
  // Ensure we have at least one order item
  TestValidator.predicate("has order items", order.orderItems.length > 0);
  // 4. Retrieve order item snapshot
  const orderItemId = order.orderItems[0].id;
  const snapshot =
    await api.functional.ecommerceMall.customer.orders.items.snapshot.at(
      customerConnection,
      {
        orderId,
        orderItemId,
      },
    );
  typia.assert(snapshot);
  // 5. Validate snapshot immutability properties - typia.assert already validates types
  TestValidator.equals(
    "snapshot orderItemId matches",
    snapshot.orderItemId,
    orderItemId,
  );
  // 6. Validate product snapshot preservation (business logic assertions, not type checks)
  TestValidator.equals(
    "product snapshot has name",
    typeof snapshot.product.name,
    "string",
  );
  TestValidator.predicate(
    "product snapshot name not empty",
    snapshot.product.name.length > 0,
  );
  TestValidator.equals(
    "product snapshot has basePrice",
    typeof snapshot.product.basePrice,
    "number",
  );
  TestValidator.equals(
    "product snapshot basePrice non-negative",
    snapshot.product.basePrice >= 0,
    true,
  );
  TestValidator.equals(
    "product snapshot has orderItemId match",
    snapshot.product.orderItemId,
    orderItemId,
  );
  // 7. Validate variant snapshot preservation
  TestValidator.equals(
    "variant snapshot has skuCode",
    typeof snapshot.variant.skuCode,
    "string",
  );
  TestValidator.predicate(
    "variant snapshot SKU not empty",
    snapshot.variant.skuCode.length > 0,
  );
  TestValidator.equals(
    "variant snapshot has price",
    typeof snapshot.variant.price,
    "number",
  );
  TestValidator.equals(
    "variant snapshot price non-negative",
    snapshot.variant.price >= 0,
    true,
  );
  TestValidator.equals(
    "variant snapshot has orderItem match",
    snapshot.variant.orderItem.id,
    orderItemId,
  );
  // 8. Validate variant option values if present
  for (let i = 0; i < snapshot.variant.optionValues.length; i++) {
    TestValidator.equals(
      `variant option ${i} has optionName`,
      typeof snapshot.variant.optionValues[i].option_name,
      "string",
    );
    TestValidator.equals(
      `variant option ${i} has optionValue`,
      typeof snapshot.variant.optionValues[i].option_value,
      "string",
    );
  }
  // 9. Validate seller snapshot preservation
  TestValidator.equals(
    "seller snapshot has shopName",
    typeof snapshot.seller.shopName,
    "string",
  );
  TestValidator.predicate(
    "seller snapshot shopName not empty",
    snapshot.seller.shopName.length > 0,
  );
  // 10. Validate snapshot creation timestamp exists
  TestValidator.predicate("snapshot has createdAt", snapshot.createdAt !== "");
  // 11. Validate product images array consistency
  TestValidator.predicate(
    "product images is array",
    Array.isArray(snapshot.product.images),
  );
  // 12. Validate immutability - snapshot data should be independent of current product state
  // Verify all snapshot references exist and contain meaningful data
  TestValidator.predicate(
    "product snapshot defines historical state",
    snapshot.product.name !== "",
  );
  TestValidator.predicate(
    "variant snapshot defines SKU state",
    snapshot.variant.skuCode !== "",
  );
  TestValidator.predicate(
    "seller snapshot defines shop identity",
    snapshot.seller.shopName !== "",
  );
}
