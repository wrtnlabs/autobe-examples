import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
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

/**
 * Test administrator order item filtering by multiple statuses with OR-logic.
 *
 * Validates that the admin order items listing endpoint correctly applies OR-logic when filtering by multiple status values. The test verifies that items matching any of the specified statuses appear in the results, that pagination metadata accurately reflects the count of matching items, and that filtering by statuses matching no items returns an empty result set.
 *
 * The test also confirms that each returned order item maintains its complete IShoppingMallOrderItem.ISummary structure — including variant option values, frozen pricing, and lifecycle status — even when viewed through multi-status filtering, ensuring the response fidelity is preserved regardless of the filter configuration.
 *
 * 1. Administrator registers and authenticates.
 * 2. Seller registers, administrator approves the seller.
 * 3. Seller creates a product, adds a variant with stock.
 * 4. Customer registers, adds the variant to cart, and places an order — creating order items in "paid" status.
 * 5. Administrator filters order items by ["paid", "shipped"]: all items returned with correct pagination.
 * 6. Administrator filters by ["cancelled", "refunded"]: empty data array with zero records in pagination.
 * 7. Each returned item validated for complete IShoppingMallOrderItem.ISummary structure.
 */
export async function test_api_admin_order_items_filter_by_multiple_statuses(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 2. Seller joins
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
  // 5. Seller creates variant with initial stock
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  // 6. Seller adds inventory stock
  const stockQuantity = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<5> & tags.Maximum<100>
  >();
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      body: {
        quantity_change: stockQuantity satisfies number as number,
        reason: "Initial stock for multi-status filter test",
      },
      params: {
        productId: product.id,
        variantId: variant.id,
      },
    },
  );
  // 7. Customer joins
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 8. Customer adds variant to cart
  await generate_random_shopping_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 1,
      },
    },
  );
  // 9. Customer places order — items created with "paid" status
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [
          {
            variant_id: variant.id,
            quantity: 1,
          },
        ],
      },
    },
  );
  typia.assert(order);
  // 10. Admin filters order items by ["paid", "shipped"] — OR-logic, all "paid" items match
  const resultWithPaidShipped =
    await api.functional.shoppingMall.admin.orders.items.index(
      adminConnection,
      {
        orderId: order.id,
        body: {
          status: ["paid", "shipped"],
        },
      },
    );
  typia.assert(resultWithPaidShipped);
  // Verify all items are returned (OR-logic matches "paid" status)
  TestValidator.equals(
    "all paid items returned via OR-logic filter",
    resultWithPaidShipped.data.length,
    order.items.length,
  );
  TestValidator.predicate(
    "pagination records equals total matching items",
    resultWithPaidShipped.pagination.records === order.items.length,
  );
  // Verify each returned item has complete IShoppingMallOrderItem.ISummary structure
  for (const item of resultWithPaidShipped.data) {
    TestValidator.predicate(
      "item has valid id",
      item.id !== "" && item.id !== null && item.id !== undefined,
    );
    TestValidator.predicate("item has valid status", item.status === "paid");
    TestValidator.predicate("item has valid price", item.price >= 0);
    TestValidator.predicate("item has valid quantity", item.quantity >= 1);
    TestValidator.predicate(
      "item has productVariant",
      item.productVariant !== null && item.productVariant !== undefined,
    );
    TestValidator.predicate(
      "item has order reference",
      item.order !== null && item.order !== undefined,
    );
    TestValidator.predicate(
      "item has created_at timestamp",
      item.created_at !== "" &&
        item.created_at !== null &&
        item.created_at !== undefined,
    );
  }
  // 11. Admin filters order items by ["cancelled", "refunded"] — no items match
  const resultWithCancelledRefunded =
    await api.functional.shoppingMall.admin.orders.items.index(
      adminConnection,
      {
        orderId: order.id,
        body: {
          status: ["cancelled", "refunded"],
        },
      },
    );
  typia.assert(resultWithCancelledRefunded);
  TestValidator.equals(
    "empty data array when no items match filter",
    resultWithCancelledRefunded.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is 0 when no items match",
    resultWithCancelledRefunded.pagination.records,
    0,
  );
}
