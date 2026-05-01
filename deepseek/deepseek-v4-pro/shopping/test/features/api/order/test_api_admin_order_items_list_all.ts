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
 * Test administrator listing all order items within a specific order without status filtering.
 *
 * Validates the default listing behavior where an administrator retrieves every order item
 * belonging to a given order using an empty request body — no status filter, no search, and
 * default pagination. This confirms the primary oversight workflow: administrators have
 * unrestricted cross-seller visibility into all items of any order.
 *
 * The test sets up a complete e-commerce flow: an administrator registers and approves a
 * seller, the seller creates a product variant with inventory, a customer registers, adds
 * the variant to their cart, and places an order. The administrator then queries the order
 * items endpoint and verifies the paginated response.
 *
 * 1. Administrator registers and authenticates via authorize_admin_join.
 * 2. Seller registers and authenticates via authorize_seller_join, starting in "pending".
 * 3. Administrator approves the pending seller using the approve endpoint.
 * 4. Seller creates a product with randomized data.
 * 5. Seller creates a purchasable variant (SKU) under that product.
 * 6. Seller adds positive inventory stock so the variant becomes purchasable.
 * 7. Customer registers and authenticates via authorize_customer_join.
 * 8. Customer adds the variant to their shopping cart.
 * 9. Customer completes checkout — order is created with "paid" order items.
 * 10. Administrator queries order items with an empty IShoppingMallOrderItem.IRequest body.
 * 11. Validates pagination metadata: current, limit, records, pages all positive numbers.
 * 12. Validates each order item's order reference, quantity, price, and status.
 * 13. Confirms items are sorted by created_at ascending (chronological).
 */
export async function test_api_admin_order_items_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registers and authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller registers and authenticates (starts in "pending" approval status)
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Administrator approves the pending seller
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: seller.id,
  });
  // 4. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 5. Seller creates a purchasable variant (SKU) with option values
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 6. Seller adds positive inventory stock so the variant is purchasable
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      params: {
        productId: product.id,
        variantId: variant.id,
      },
    },
  );
  // 7. Customer registers and authenticates
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 8. Customer adds the variant to the shopping cart
  await generate_random_shopping_mall_customer_cart_items_create(
    customerConnection,
    {
      body: { productVariantId: variant.id },
    },
  );
  // 9. Customer completes checkout — order items created with "paid" status
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [{ variant_id: variant.id, quantity: 1 }],
      },
    },
  );
  typia.assert(order);
  // 10. Administrator lists all order items without any status filtering
  const page = await api.functional.shoppingMall.admin.orders.items.index(
    adminConnection,
    {
      orderId: order.id,
      body: {} satisfies IShoppingMallOrderItem.IRequest,
    },
  );
  typia.assert(page);
  // 11. Validate pagination metadata
  TestValidator.predicate(
    "pagination current is positive",
    page.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    page.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is positive",
    page.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages is positive",
    page.pagination.pages > 0,
  );
  // 12. Validate each order item
  TestValidator.equals(
    "order items count matches",
    page.data.length,
    order.items.length,
  );
  for (const item of page.data) {
    TestValidator.equals("item order ID matches", item.order.id, order.id);
    TestValidator.predicate("item quantity is positive", item.quantity >= 1);
    TestValidator.predicate("item price is non-negative", item.price >= 0);
    TestValidator.predicate(
      "item status is valid lifecycle value",
      ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
        item.status,
      ),
    );
  }
  // 13. Confirm items are sorted by created_at ascending (chronological order)
  if (page.data.length > 1) {
    for (let i = 1; i < page.data.length; i++) {
      TestValidator.predicate(
        "items sorted by created_at ascending",
        page.data[i].created_at >= page.data[i - 1].created_at,
      );
    }
  }
}
