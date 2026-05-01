import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshot";
import type { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
import type { IShoppingMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSellerSnapshot";
import type { IShoppingMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that the system blocks cross-seller shipment bundling.
 *
 * Validates the business rule that a seller cannot include order items belonging to a different seller in their shipment. The test sets up two approved sellers, each with a product variant and stock, then has a customer place an order containing one item from each seller.
 *
 * The test verifies that when Seller A attempts to create a shipment containing both their own item and Seller B's item, the system rejects the request with a 403 Forbidden error. After the rejection, both items retain their \"paid\" status, confirming no partial state changes occurred.
 *
 * Finally, Seller A creates a valid shipment with only their own order item, confirming that independent shipping still works correctly. The shipment response is validated to contain only Seller A's item in \"shipped\" status.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller A registers, is approved by admin, creates product with variant and inventory stock.
 * 3. Seller B registers, is approved by admin, creates product with variant and inventory stock.
 * 4. Customer registers and places an order containing one item from each seller's variant.
 * 5. Seller A attempts cross-seller shipment with both order items — rejected with 403.
 * 6. Validates all order items remain \"paid\" after the failed cross-seller shipment attempt.
 * 7. Seller A creates a valid shipment with only their own order item — succeeds.
 * 8. Validates Seller A's item transitions to \"shipped\", Seller B's item is excluded from the shipment.
 */
export async function test_api_shipment_create_cross_seller_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller A: register, approve, create product, variant, and stock
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerAPassword = RandomGenerator.alphaNumeric(16);
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: { email: sellerAEmail, password: sellerAPassword },
  });
  typia.assert(sellerA);
  const approvedSellerA =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerA.id,
    });
  typia.assert(approvedSellerA);
  const sellerAProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerAConnection,
      { body: { shopping_mall_category_id: category.id } },
    );
  typia.assert(sellerAProduct);
  const sellerAVariant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerAConnection,
      { params: { productId: sellerAProduct.id } },
    );
  typia.assert(sellerAVariant);
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerAConnection,
    {
      body: { quantity_change: 10, reason: "Initial stock for Seller A" },
      params: {
        productId: sellerAProduct.id,
        variantId: sellerAVariant.id,
      },
    },
  );
  // 3. Seller B: register, approve, create product, variant, and stock
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerBPassword = RandomGenerator.alphaNumeric(16);
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: { email: sellerBEmail, password: sellerBPassword },
  });
  typia.assert(sellerB);
  const approvedSellerB =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerB.id,
    });
  typia.assert(approvedSellerB);
  const sellerBProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerBConnection,
      { body: { shopping_mall_category_id: category.id } },
    );
  typia.assert(sellerBProduct);
  const sellerBVariant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerBConnection,
      { params: { productId: sellerBProduct.id } },
    );
  typia.assert(sellerBVariant);
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerBConnection,
    {
      body: { quantity_change: 10, reason: "Initial stock for Seller B" },
      params: {
        productId: sellerBProduct.id,
        variantId: sellerBVariant.id,
      },
    },
  );
  // 4. Customer: register and place an order with items from both sellers
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [
          { variant_id: sellerAVariant.id, quantity: 1 },
          { variant_id: sellerBVariant.id, quantity: 1 },
        ],
      },
    },
  );
  typia.assert(order);
  const sellerAItem = order.items.find(
    (item) => item.variant.id === sellerAVariant.id,
  )!;
  const sellerBItem = order.items.find(
    (item) => item.variant.id === sellerBVariant.id,
  )!;
  TestValidator.equals(
    "seller A item initially paid",
    sellerAItem.status,
    "paid",
  );
  TestValidator.equals(
    "seller B item initially paid",
    sellerBItem.status,
    "paid",
  );
  // 5. Seller A attempts cross-seller shipment — must be rejected with 403
  await TestValidator.error(
    "cross-seller shipment bundling blocked",
    async () => {
      await api.functional.shoppingMall.seller.orders.shipments.create(
        sellerAConnection,
        {
          orderId: order.id,
          body: {
            orderItemIds: [sellerAItem.id, sellerBItem.id],
            carrier_name: "FedEx",
            tracking_number: "CROSS-SELLER-TEST-001",
          },
        },
      );
    },
  );
  // 6. Verify items remain "paid" after the failed cross-seller attempt
  TestValidator.equals(
    "seller A item remains paid after blocked shipment",
    sellerAItem.status,
    "paid",
  );
  TestValidator.equals(
    "seller B item remains paid after blocked shipment",
    sellerBItem.status,
    "paid",
  );
  // 7. Seller A creates a valid shipment with only their own order item
  const validShipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerAConnection,
      {
        body: { orderItemIds: [sellerAItem.id] },
        params: { orderId: order.id },
      },
    );
  typia.assert(validShipment);
  // 8. Verify Seller A's item is now "shipped" and Seller B's item is not in the shipment
  const shippedItem = validShipment.orderItems.find(
    (item) => item.id === sellerAItem.id,
  )!;
  TestValidator.equals(
    "seller A item transitioned to shipped",
    shippedItem.status,
    "shipped",
  );
  TestValidator.predicate(
    "seller B item not included in shipment",
    () => !validShipment.orderItems.some((item) => item.id === sellerBItem.id),
  );
}
