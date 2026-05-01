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

/**
 * Test that an administrator can retrieve full order item details including all purchase-time snapshots.
 *
 * Validates that the admin order item retrieval endpoint returns comprehensive information: the parent
 * order summary, product variant reference, frozen unit price and quantity, current item status, and
 * all three purchase-time snapshots (product, variant, seller). Also confirms that cancellation and
 * refund request arrays are empty for a freshly created order, and that the shipment reference is null
 * since the item has not yet been shipped.
 *
 * The test ensures historical data integrity — all snapshot fields reflect the exact state at purchase
 * time, and administrators have unrestricted access to any order item on the platform.
 *
 * 1. Administrator registers and authenticates to the platform.
 * 2. Seller registers to the platform.
 * 3. Administrator creates a product category for the seller's product.
 * 4. Seller creates a product under the created category.
 * 5. Seller creates a purchasable variant with SKU code and option values.
 * 6. Seller adds positive stock via an inventory record so the variant can be purchased.
 * 7. Customer registers and authenticates.
 * 8. Customer places an order for the variant, which atomically creates the order item with snapshots.
 * 9. Administrator retrieves the order item by order code and item ID.
 * 10. Validates all fields including snapshots, empty cancellation/refund arrays, and null shipment.
 */
export async function test_api_order_item_admin_retrieval_with_snapshots(
  connection: api.IConnection,
) {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Create category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 4. Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 5. Create variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 6. Add stock
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      params: {
        productId: product.id,
        variantId: variant.id,
      },
    },
  );
  // 7. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 8. Place order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [
          {
            variant_id: variant.id,
            quantity: 1,
          } satisfies IShoppingMallOrderItem.ICreate,
        ],
      },
    },
  );
  typia.assert(order);
  // 9. Admin retrieves order item
  const orderItem = order.items[0];
  const retrievedItem = await api.functional.shoppingMall.admin.orders.items.at(
    adminConnection,
    {
      orderCode: order.code,
      itemId: orderItem.id,
    },
  );
  typia.assert(retrievedItem);
  // 10. Validate order summary
  TestValidator.equals("order code", retrievedItem.order.code, order.code);
  TestValidator.equals("order status", retrievedItem.order.status, "paid");
  TestValidator.predicate(
    "order has created_at",
    retrievedItem.order.created_at.length > 0,
  );
  // 11. Validate variant reference
  TestValidator.equals("variant id", retrievedItem.variant.id, variant.id);
  TestValidator.equals(
    "variant code",
    retrievedItem.variant.code,
    variant.code,
  );
  // 12. Validate quantity and price
  TestValidator.equals("quantity", retrievedItem.quantity, 1);
  TestValidator.predicate("price is positive", retrievedItem.price > 0);
  // 13. Validate status
  TestValidator.equals("item status", retrievedItem.status, "paid");
  // 14. Validate product snapshot
  TestValidator.predicate(
    "product snapshot exists",
    retrievedItem.productSnapshot !== null,
  );
  const productSnapshot = retrievedItem.productSnapshot!;
  typia.assertGuard<IShoppingMallOrderItemProductSnapshot>(productSnapshot);
  TestValidator.equals(
    "product snapshot name",
    productSnapshot.name,
    product.name,
  );
  TestValidator.equals(
    "product snapshot description",
    productSnapshot.description,
    product.description,
  );
  TestValidator.equals(
    "product snapshot base_price",
    productSnapshot.base_price,
    product.base_price,
  );
  TestValidator.equals(
    "product snapshot category_name",
    productSnapshot.category_name,
    category.name,
  );
  TestValidator.predicate(
    "product snapshot has images array",
    Array.isArray(productSnapshot.productSnapshotImages),
  );
  // 15. Validate variant snapshot
  TestValidator.predicate(
    "variant snapshot exists",
    retrievedItem.variantSnapshot !== null,
  );
  const variantSnapshot = retrievedItem.variantSnapshot!;
  typia.assertGuard<IShoppingMallOrderItemVariantSnapshot>(variantSnapshot);
  TestValidator.equals(
    "variant snapshot sku_code",
    variantSnapshot.sku_code,
    variant.code,
  );
  TestValidator.predicate(
    "variant snapshot option_values is string",
    typeof variantSnapshot.option_values === "string",
  );
  TestValidator.predicate(
    "variant snapshot option_values not empty",
    variantSnapshot.option_values.length > 0,
  );
  TestValidator.equals(
    "variant snapshot price matches item price",
    variantSnapshot.price,
    retrievedItem.price,
  );
  // 16. Validate seller snapshot
  TestValidator.predicate(
    "seller snapshot exists",
    retrievedItem.sellerSnapshot !== null,
  );
  const sellerSnapshot = retrievedItem.sellerSnapshot!;
  typia.assertGuard<IShoppingMallOrderItemSellerSnapshot>(sellerSnapshot);
  TestValidator.predicate(
    "seller snapshot has shop_name",
    typeof sellerSnapshot.shop_name === "string" &&
      sellerSnapshot.shop_name.length > 0,
  );
  // 17. Validate empty cancellation and refund requests
  TestValidator.equals(
    "cancellation requests empty",
    retrievedItem.cancellationRequests.length,
    0,
  );
  TestValidator.equals(
    "refund requests empty",
    retrievedItem.refundRequests.length,
    0,
  );
  // 18. Validate null shipment
  TestValidator.equals("shipment is null", retrievedItem.shipment, null);
}
