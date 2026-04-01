import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
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

/**
 * Test that a customer can successfully retrieve an order item snapshot after placing an order.
 *
 * This test validates:
 * 1. Customer registration and authentication
 * 2. Address creation for shipping
 * 3. Cart item addition with product variant
 * 4. Order placement which generates snapshots
 * 5. Snapshot retrieval with all required fields
 * 6. Snapshot structure and data integrity
 */
export async function test_api_order_item_snapshot_retrieval_after_purchase(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new customer account
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
        streetAddress: `${RandomGenerator.alphabets(10)} ${RandomGenerator.alphabets(8)}`,
        city: RandomGenerator.name(),
        state: RandomGenerator.name(),
        postalCode: typia.random<string>(),
        country: "South Korea",
        isDefault: true,
      } satisfies IShoppingMallAddress.ICreate,
    },
  );
  typia.assert(address);
  // 3. Add product variant to cart
  // Note: In a real test scenario, shopping_mall_product_variant_id would come from an existing product variant
  // For this test, we use a valid UUID format that the backend would validate
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 4. Place order (this creates order items and snapshots automatically)
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shopping_mall_address_id: address.id,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 5. Extract IDs from order response
  const orderId = order.id;
  const orderItem = order.orderItems[0];
  const orderItemId = orderItem.id;
  // The snapshot is created automatically when the order is placed
  // For this test, we use the orderItemId as the snapshotId since snapshots are created per order item
  // In production, the snapshot ID would be returned in the order response or queried separately
  const snapshotId = orderItemId;
  // 6. Retrieve the order item snapshot
  const snapshot =
    await api.functional.shoppingMall.customer.orders.items.snapshots.at(
      customerConnection,
      {
        orderId: orderId,
        itemId: orderItemId,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 7. Validate snapshot structure and required fields
  TestValidator.predicate("snapshot has valid id", snapshot.id.length > 0);
  TestValidator.equals(
    "snapshot orderItemId matches order item",
    snapshot.orderItemId,
    orderItemId,
  );
  TestValidator.predicate(
    "snapshot has product name",
    snapshot.productName.length > 0,
  );
  TestValidator.predicate(
    "snapshot has variant SKU code",
    snapshot.variantSkuCode.length > 0,
  );
  TestValidator.predicate(
    "snapshot has variant price",
    snapshot.variantPrice >= 0,
  );
  TestValidator.predicate(
    "snapshot has seller shop name",
    snapshot.sellerShopName.length > 0,
  );
  TestValidator.predicate(
    "snapshot has valid createdAt timestamp",
    snapshot.createdAt.length > 0,
  );
  TestValidator.predicate(
    "snapshot has variant options array",
    Array.isArray(snapshot.variantOptions),
  );
  // 8. Validate variant options structure if present
  if (snapshot.variantOptions.length > 0) {
    const variantOption = snapshot.variantOptions[0];
    TestValidator.predicate(
      "variant option has valid id",
      variantOption.id.length > 0,
    );
    TestValidator.predicate(
      "variant option has option name",
      variantOption.optionName.length > 0,
    );
    TestValidator.predicate(
      "variant option has option value",
      variantOption.optionValue.length > 0,
    );
    TestValidator.predicate(
      "variant option has valid createdAt",
      variantOption.createdAt.length > 0,
    );
  }
}
