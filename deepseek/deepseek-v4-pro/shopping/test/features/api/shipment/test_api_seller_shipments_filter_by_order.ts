import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that a seller can filter their shipments to view only those belonging to a
 * specific order, isolating shipments from other orders.
 *
 * Verifies the PATCH /shoppingMall/seller/shipments endpoint correctly filters
 * shipments by the `orderId` request parameter. The test creates two separate
 * customer orders — each with its own shipment — and confirms that filtering by
 * one order's UUID returns only that order's shipments while completely excluding
 * the other order's shipments.
 *
 * The pagination metadata is validated to ensure it reflects only the filtered
 * subset, and each returned shipment's nested `order` summary is verified to
 * contain the correct `id` and `code`.
 *
 * 1. Admin registers and approves the seller account.
 * 2. Seller creates a product, a purchasable variant, and adds inventory.
 * 3. Customer registers and places two separate orders for the same variant.
 * 4. Seller creates a shipment for each order.
 * 5. Filter shipments by the first order's ID — verify all results reference
 *    the first order and exclude the second order's shipment.
 * 6. Filter shipments by the second order's ID — verify all results reference
 *    the second order and exclude the first order's shipment.
 * 7. Confirm pagination metadata reports the correct record count for each filter.
 */
export async function test_api_seller_shipments_filter_by_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Admin approves seller
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: seller.id,
  });
  // 4. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 5. Seller creates variant with initial stock
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: { initialStockQuantity: 100 },
      },
    );
  typia.assert(variant);
  // 6. Seller adds inventory record
  const inventoryRecord =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
      },
    );
  typia.assert(inventoryRecord);
  // 7. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 8. Customer adds variant to cart
  await generate_random_shopping_mall_customer_cart_items_create(
    customerConnection,
    {
      body: { productVariantId: variant.id, quantity: 2 },
    },
  );
  // 9. Customer places first order
  const firstOrder = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [{ variant_id: variant.id, quantity: 2 }],
      },
    },
  );
  typia.assert(firstOrder);
  // 10. Seller creates shipment for first order
  const firstShipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: firstOrder.id },
        body: {
          orderItemIds: firstOrder.items.map(
            (item: IShoppingMallOrderItem) => item.id,
          ),
        },
      },
    );
  typia.assert(firstShipment);
  // 11. Customer adds variant to cart again
  await generate_random_shopping_mall_customer_cart_items_create(
    customerConnection,
    {
      body: { productVariantId: variant.id, quantity: 1 },
    },
  );
  // 12. Customer places second order
  const secondOrder =
    await generate_random_shopping_mall_customer_orders_create(
      customerConnection,
      {
        body: {
          items: [{ variant_id: variant.id, quantity: 1 }],
        },
      },
    );
  typia.assert(secondOrder);
  // 13. Seller creates shipment for second order
  const secondShipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: secondOrder.id },
        body: {
          orderItemIds: secondOrder.items.map(
            (item: IShoppingMallOrderItem) => item.id,
          ),
        },
      },
    );
  typia.assert(secondShipment);
  // 14. Filter shipments by first order ID
  const firstFilterResult =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: { orderId: firstOrder.id },
    });
  typia.assert(firstFilterResult);
  // Verify all returned shipments have order matching first order
  for (const shipment of firstFilterResult.data) {
    TestValidator.equals(
      "first filter: shipment order id matches",
      shipment.order.id,
      firstOrder.id,
    );
    TestValidator.equals(
      "first filter: shipment order code matches",
      shipment.order.code,
      firstOrder.code,
    );
  }
  // Verify first shipment is present in first filter results
  TestValidator.predicate(
    "first shipment found in first filter results",
    firstFilterResult.data.some((s) => s.id === firstShipment.id),
  );
  // Verify second shipment is NOT present in first filter results
  TestValidator.predicate(
    "second shipment excluded from first filter results",
    !firstFilterResult.data.some((s) => s.id === secondShipment.id),
  );
  // Verify pagination metadata reflects only first order's shipments
  TestValidator.equals(
    "first filter: pagination records matches data length",
    firstFilterResult.pagination.records,
    firstFilterResult.data.length,
  );
  // 15. Filter shipments by second order ID
  const secondFilterResult =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: { orderId: secondOrder.id },
    });
  typia.assert(secondFilterResult);
  // Verify all returned shipments have order matching second order
  for (const shipment of secondFilterResult.data) {
    TestValidator.equals(
      "second filter: shipment order id matches",
      shipment.order.id,
      secondOrder.id,
    );
    TestValidator.equals(
      "second filter: shipment order code matches",
      shipment.order.code,
      secondOrder.code,
    );
  }
  // Verify second shipment is present in second filter results
  TestValidator.predicate(
    "second shipment found in second filter results",
    secondFilterResult.data.some((s) => s.id === secondShipment.id),
  );
  // Verify first shipment is NOT present in second filter results
  TestValidator.predicate(
    "first shipment excluded from second filter results",
    !secondFilterResult.data.some((s) => s.id === firstShipment.id),
  );
  // Verify pagination metadata reflects only second order's shipments
  TestValidator.equals(
    "second filter: pagination records matches data length",
    secondFilterResult.pagination.records,
    secondFilterResult.data.length,
  );
}
