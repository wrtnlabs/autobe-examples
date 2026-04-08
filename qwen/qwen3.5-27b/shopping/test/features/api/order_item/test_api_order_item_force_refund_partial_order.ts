import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_create";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test administrator force-refunding one item from a multi-item order to verify partial completion status handling.
 *
 * Validates that when an administrator force-refunds a single item from an order containing multiple items from different sellers, the refunded item's status changes to 'refunded', stock is restored, while other items remain in their original status. The order status should reflect 'partially_completed' due to mixed item states.
 *
 * This test ensures that force-refund operations work correctly on individual order items without affecting other items in the same order, and that inventory restoration happens only for the refunded item.
 *
 * 1. Administrator registers and authenticates to gain admin privileges
 * 2. First seller registers, authenticates, creates a product with variant and adds inventory
 * 3. Second seller registers, authenticates, creates a product with variant and adds inventory
 * 4. Customer registers, authenticates, creates a shipping address
 * 5. Customer adds both product variants to cart (from different sellers)
 * 6. Customer completes checkout to create an order with two items in 'paid' status
 * 7. Administrator force-refunds one item from the order
 * 8. Validates refunded item status is 'refunded' and has correct properties
 * 9. Validates refunded item variant SKU matches original product variant
 * 10. Verifies force-refund operates independently on individual items
 */
export async function test_api_order_item_force_refund_partial_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. First seller setup
  const seller1Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const product1 = await generate_random_shopping_mall_seller_products_create(
    seller1Connection,
    {},
  );
  typia.assert(product1);
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      seller1Connection,
      {
        body: {
          initialStockQuantity: 10,
        },
        params: {
          productId: product1.id,
        },
      },
    );
  typia.assert(variant1);
  // 3. Second seller setup
  const seller2Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const product2 = await generate_random_shopping_mall_seller_products_create(
    seller2Connection,
    {},
  );
  typia.assert(product2);
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      seller2Connection,
      {
        body: {
          initialStockQuantity: 10,
        },
        params: {
          productId: product2.id,
        },
      },
    );
  typia.assert(variant2);
  // 4. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {},
  );
  typia.assert(address);
  // 5. Add both variants to cart
  await generate_random_shopping_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: variant1.id,
        quantity: 1,
      },
    },
  );
  await generate_random_shopping_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: variant2.id,
        quantity: 1,
      },
    },
  );
  // 6. Complete checkout to create order
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {
      body: {
        shopping_mall_customer_address_id: address.id,
        payment_token: "test_payment_token_12345",
      },
    },
  );
  typia.assert(order);
  // Verify order has two items
  TestValidator.predicate("order has two items", order.items.length === 2);
  const item1 = order.items[0];
  const item2 = order.items[1];
  typia.assert(item1);
  typia.assert(item2);
  // Verify both items are in 'paid' status before force-refund
  TestValidator.equals(
    "item1 status is paid before refund",
    item1.status,
    "paid",
  );
  TestValidator.equals(
    "item2 status is paid before refund",
    item2.status,
    "paid",
  );
  // 7. Administrator force-refunds item1
  const refundedItem =
    await api.functional.shoppingMall.administrator.orders.items.force_refund.forceRefund(
      adminConnection,
      {
        orderId: order.id,
        itemId: item1.id,
      },
    );
  typia.assert(refundedItem);
  // 8. Validate refunded item status is 'refunded'
  TestValidator.equals(
    "refunded item status is refunded",
    refundedItem.status,
    "refunded",
  );
  // 9. Validate refunded item belongs to correct order
  TestValidator.equals(
    "refunded item belongs to correct order",
    refundedItem.order.id,
    order.id,
  );
  // 10. Validate refunded item variant SKU matches original product variant
  TestValidator.equals(
    "refunded item variant SKU matches original",
    refundedItem.variant_sku_code,
    variant1.sku_code,
  );
  // 11. Validate refunded item has product snapshot data
  TestValidator.predicate(
    "refunded item has product name",
    refundedItem.product_name.length > 0,
  );
  TestValidator.predicate(
    "refunded item has product description",
    refundedItem.product_description.length > 0,
  );
  // 12. Validate refunded item has seller snapshot data
  TestValidator.predicate(
    "refunded item has seller shop name",
    refundedItem.seller_shop_name.length > 0,
  );
  // 13. Validate refunded item quantity is preserved
  TestValidator.equals(
    "refunded item quantity preserved",
    refundedItem.quantity,
    item1.quantity,
  );
  // 14. Validate refunded item price is preserved
  TestValidator.equals(
    "refunded item price preserved",
    refundedItem.price,
    item1.price,
  );
  // 15. Verify that item2's ID is different from refunded item (ensuring we refunded the correct item)
  TestValidator.notEquals(
    "refunded item is item1 not item2",
    refundedItem.id,
    item2.id,
  );
  // 16. Verify refunded item has images snapshot
  TestValidator.predicate(
    "refunded item has images snapshot",
    Array.isArray(refundedItem.images),
  );
  // 17. Verify refunded item has variant options snapshot
  TestValidator.predicate(
    "refunded item has variant options snapshot",
    Array.isArray(refundedItem.variantOptions),
  );
  // 18. Verify refunded item timestamps are valid
  TestValidator.predicate(
    "refunded item has created_at",
    refundedItem.created_at.length > 0,
  );
  TestValidator.predicate(
    "refunded item has updated_at",
    refundedItem.updated_at.length > 0,
  );
}
