import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshot";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
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
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

export async function test_api_order_item_snapshot_customer_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication via join
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Create shipping address for the customer
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(),
        state: RandomGenerator.name(),
        postalCode: typia.random<string>(),
        country: "South Korea",
        isDefault: true,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address);
  // 3. Add product variant to cart (utility handles variant selection)
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  // 4. Place order which creates order items and their snapshots
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shopping_mall_address_id: address.id,
        cart_item_ids: [cartItem.id],
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 5. Validate order has at least one order item
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  const orderItem = order.orderItems[0]!;
  // 6. Retrieve order item snapshot
  const snapshotResponse =
    await api.functional.shoppingMall.customer.orders.items.snapshots.index(
      customerConnection,
      {
        orderId: order.id,
        itemId: orderItem.id,
        body: {
          page: 1,
          limit: 10,
          sort: "created_at,desc",
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(snapshotResponse);
  // 7. Validate snapshot response structure
  TestValidator.predicate(
    "has pagination",
    snapshotResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "has data array",
    Array.isArray(snapshotResponse.data),
  );
  TestValidator.equals("exactly one snapshot", snapshotResponse.data.length, 1);
  const snapshot = snapshotResponse.data[0]!;
  typia.assert(snapshot);
  // 8. Validate snapshot data integrity - snapshot preserves historical state
  TestValidator.predicate(
    "productName is non-empty",
    snapshot.productName.length > 0,
  );
  TestValidator.predicate(
    "variantSkuCode is non-empty",
    snapshot.variantSkuCode.length > 0,
  );
  TestValidator.predicate(
    "variantPrice is positive",
    snapshot.variantPrice > 0,
  );
  TestValidator.predicate(
    "sellerShopName is non-empty",
    snapshot.sellerShopName.length > 0,
  );
  TestValidator.predicate(
    "createdAt is valid date",
    !isNaN(Date.parse(snapshot.createdAt)),
  );
  // 9. Validate snapshot price matches order item price (snapshot preserves purchase price)
  TestValidator.equals(
    "variantPrice matches order item price",
    snapshot.variantPrice,
    orderItem.price,
  );
  // 10. Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    snapshotResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "total records is 1",
    snapshotResponse.pagination.records,
    1,
  );
  TestValidator.equals(
    "total pages is 1",
    snapshotResponse.pagination.pages,
    1,
  );
}