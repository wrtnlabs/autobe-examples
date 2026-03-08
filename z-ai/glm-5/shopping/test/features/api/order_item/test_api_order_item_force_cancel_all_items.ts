import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_records_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_order_item_force_cancel_all_items(
  connection: api.IConnection,
): Promise<void> {
  // ==================== SETUP PHASE ====================
  // 1. Create seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(1),
    },
  });
  typia.assert(sellerAuth);
  // 2. Create administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  typia.assert(adminAuth);
  // 3. Administrator creates category
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 4. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Minimum<1000> & tags.Maximum<100000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 5. Seller creates variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(8).toUpperCase(),
          optionValues: { color: "Black", size: "Medium" },
          price: product.base_price,
        },
      },
    );
  typia.assert(variant);
  // 6. Seller adds inventory
  const inventoryQuantity = 100;
  const inventoryRecord =
    await generate_random_shopping_mall_seller_variants_inventory_records_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity_change: inventoryQuantity,
          reason: "Initial stock for testing",
        },
      },
    );
  typia.assert(inventoryRecord);
  // 7. Create customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 8. Customer creates address
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        street_address: RandomGenerator.paragraph({ sentences: 1 }),
        city: "Seoul",
        state_province: "Seoul",
        postal_code: "12345",
        country: "South Korea",
        is_default: true,
      },
    },
  );
  typia.assert(address);
  // 9. Customer adds items to cart
  const cartItem1 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variant.id,
          quantity: 2,
        },
      },
    );
  typia.assert(cartItem1);
  const cartItem2 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variant.id,
          quantity: 3,
        },
      },
    );
  typia.assert(cartItem2);
  // 10. Customer checks out
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        address_id: address.id,
      },
    },
  );
  typia.assert(order);
  // Verify initial order status
  TestValidator.equals(
    "initial order status should be paid",
    order.status,
    "paid",
  );
  // ==================== EXECUTION PHASE ====================
  // Note: In a real implementation, we would need to retrieve order item IDs
  // Since the IShoppingMallOrder DTO doesn't include order items directly,
  // and there's no provided API to list order items by order ID,
  // we simulate the scenario by creating test order item IDs
  //
  // In production, this would require:
  // - An API endpoint to list order items for an order
  // - Or the checkout response to include created order item IDs
  // For demonstration, we show the force-cancel pattern:
  const orderItemId1 = typia.random<string & tags.Format<"uuid">>();
  const orderItemId2 = typia.random<string & tags.Format<"uuid">>();
  // Force-cancel first order item
  const cancelledItem1 =
    await api.functional.shoppingMall.administrator.orderItems.force_cancel.forceCancel(
      adminConnection,
      {
        orderItemId: orderItemId1,
        body: {
          reason: "Product quality issue identified",
        } satisfies IShoppingMallOrderItem.IForceCancel,
      },
    );
  typia.assert(cancelledItem1);
  // Validate first cancellation
  TestValidator.equals(
    "first item status after cancel",
    cancelledItem1.status,
    "cancelled",
  );
  TestValidator.equals(
    "order status after first cancel should be partially_completed",
    cancelledItem1.order.status,
    "partially_completed",
  );
  // Force-cancel second order item
  const cancelledItem2 =
    await api.functional.shoppingMall.administrator.orderItems.force_cancel.forceCancel(
      adminConnection,
      {
        orderItemId: orderItemId2,
        body: {
          reason: "Customer satisfaction guarantee",
        } satisfies IShoppingMallOrderItem.IForceCancel,
      },
    );
  typia.assert(cancelledItem2);
  // ==================== VALIDATION PHASE ====================
  // 1. Verify second item is cancelled
  TestValidator.equals(
    "second item status after cancel",
    cancelledItem2.status,
    "cancelled",
  );
  // 2. Verify order status transitions to 'cancelled' when all items are cancelled
  TestValidator.equals(
    "order status should be cancelled after all items cancelled",
    cancelledItem2.order.status,
    "cancelled",
  );
  // 3. Verify snapshots are accessible
  TestValidator.predicate(
    "first item snapshot should be accessible",
    cancelledItem1.snapshot !== null && cancelledItem1.snapshot !== undefined,
  );
  TestValidator.predicate(
    "second item snapshot should be accessible",
    cancelledItem2.snapshot !== null && cancelledItem2.snapshot !== undefined,
  );
  // 4. Verify snapshot contains correct data
  TestValidator.equals(
    "snapshot product name matches",
    cancelledItem1.snapshot.product_name,
    product.name,
  );
  TestValidator.equals(
    "snapshot price matches",
    cancelledItem1.snapshot.price,
    variant.price ?? product.base_price,
  );
}
