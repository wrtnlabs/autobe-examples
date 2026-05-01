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
 * Validates that variant snapshots survive the deletion of their source variant per Section 449 and Section 571.
 *
 * After an order is placed and the variant snapshot is captured at purchase time, the seller deletes the original variant entirely. The administrator then retrieves the variant snapshot for the order item and verifies that the snapshot still exists intact — containing the original SKU code, option values, unit price, and created_at timestamp from purchase time.
 *
 * This confirms the business rule that snapshots are independently preserved and survive entity deletion, remaining accessible for audit and dispute resolution purposes even after the source variant no longer exists.
 *
 * 1. Administrator registers and logs into the platform.
 * 2. Seller registers and logs into the platform.
 * 3. Administrator approves the pending seller to unlock selling privileges.
 * 4. Administrator creates a product category for classification.
 * 5. Seller creates a product under the approved category.
 * 6. Seller creates a variant with SKU code, option values, and a specific price override.
 * 7. Seller adds positive inventory stock so the variant is purchasable.
 * 8. Customer registers, logs in, and places an order for the variant — capturing the variant snapshot atomically.
 * 9. Seller deletes the original variant after the order is placed.
 * 10. Administrator retrieves the variant snapshot for the order item.
 * 11. Validates the snapshot integrity: SKU code, price, option values, and created_at timestamp are preserved intact.
 */
export async function test_api_variant_snapshot_survival_after_variant_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Admin approves the seller
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: seller.id,
  });
  // 4. Admin creates a product category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  // 5. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  // 6. Seller creates a variant with a known price override
  const variantPrice = 50000;
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          price: variantPrice,
        },
      },
    );
  typia.assert(variant);
  // 7. Seller adds inventory stock
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      params: { productId: product.id, variantId: variant.id },
      body: {
        quantity_change: 100,
        reason: "Initial stock for variant snapshot test",
      },
    },
  );
  // 8. Customer registration and login
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 9. Customer places an order referencing the variant
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
  // 10. Extract the order item from the order
  const orderItem = order.items[0];
  typia.assert(orderItem);
  // 11. Seller deletes the variant after order placement
  await api.functional.shoppingMall.seller.products.variants.erase(
    sellerConnection,
    {
      productId: product.id,
      variantId: variant.id,
    },
  );
  // 12. Admin retrieves the variant snapshot for the order item
  const variantSnapshot =
    await api.functional.shoppingMall.admin.order_items.variant_snapshot.at(
      adminConnection,
      { itemId: orderItem.id },
    );
  typia.assert(variantSnapshot);
  // 13. Validate snapshot integrity — snapshot survives variant deletion
  TestValidator.equals(
    "snapshot sku code matches original variant code",
    variantSnapshot.sku_code,
    variant.code,
  );
  TestValidator.equals(
    "snapshot price matches original variant price override",
    variantSnapshot.price,
    variantPrice,
  );
  TestValidator.predicate(
    "snapshot option values are preserved",
    variantSnapshot.option_values.length > 0,
  );
  TestValidator.predicate(
    "snapshot created_at timestamp is valid",
    variantSnapshot.created_at !== null &&
      new Date(variantSnapshot.created_at).getTime() > 0,
  );
}
