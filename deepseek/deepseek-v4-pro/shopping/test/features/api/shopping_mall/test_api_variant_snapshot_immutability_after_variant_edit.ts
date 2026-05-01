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
 * Validates that variant snapshots are permanently immutable after the seller edits the original variant.
 *
 * Confirms that when a customer places an order, the variant's SKU code, option values, and unit price are atomically captured in an immutable snapshot at purchase time. The seller then edits the original variant — changing its SKU code, option values, and price override. The administrator retrieves the variant snapshot for the order item and verifies it still reflects the frozen original data from purchase time, not the seller's later edits. This proves that variant snapshots are permanently immutable records untouched by subsequent modifications to the live variant, preserving historically accurate purchase context per Section 448 and Section 571.
 *
 * 1. Administrator registers and creates a category for product classification.
 * 2. Customer registers to place the order.
 * 3. Seller registers, is approved by administrator, and creates a product with a variant having specific SKU code, option values, and price.
 * 4. Customer places an order for the variant — atomically capturing the variant snapshot with original data.
 * 5. Seller edits the variant — changing SKU code, option values, and price to create divergence between the live variant and the frozen snapshot.
 * 6. Administrator retrieves the variant snapshot for the order item and verifies all fields match the original purchase-time values.
 */
export async function test_api_variant_snapshot_immutability_after_variant_edit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 3. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 4. Administrator approves seller
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: seller.id,
  });
  // 5. Administrator creates category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  // 6. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: { shopping_mall_category_id: category.id } },
  );
  // 7. Seller creates variant with specific original values
  const originalCode = `ORIGINAL-${RandomGenerator.alphaNumeric(8)}`;
  const originalPrice = 15000;
  const originalOptionValues = [
    { key: "Color", value: "Red" },
    { key: "Size", value: "Large" },
  ] satisfies IShoppingMallProductVariantOptionValue.ICreate[];
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          code: originalCode,
          optionValues: originalOptionValues,
          price: originalPrice,
          initialStockQuantity: 100,
        },
        params: { productId: product.id },
      },
    );
  // 8. Customer places an order — atomically captures variant snapshot
  const order = await api.functional.shoppingMall.customer.orders.create(
    customerConnection,
    {
      body: {
        items: [{ variant_id: variant.id, quantity: 1 }],
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        street_address: "123 Test Street",
        city: "Test City",
        state_province: "Test State",
        postal_code: "12345",
        country: "Test Country",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  const orderItem = order.items[0];
  // 9. Seller edits the variant with completely different values
  const updatedCode = `UPDATED-${RandomGenerator.alphaNumeric(8)}`;
  const updatedPrice = 25000;
  const updatedOptionValues = [
    { key: "Color", value: "Blue" },
    { key: "Size", value: "Small" },
  ] satisfies IShoppingMallProductVariantOptionValue.ICreate[];
  await api.functional.shoppingMall.seller.products.variants.update(
    sellerConnection,
    {
      productId: product.id,
      variantId: variant.id,
      body: {
        code: updatedCode,
        optionValues: updatedOptionValues,
        price: updatedPrice,
      } satisfies IShoppingMallProductVariant.IUpdate,
    },
  );
  // 10. Administrator retrieves the variant snapshot for the order item
  const snapshot =
    await api.functional.shoppingMall.admin.order_items.variant_snapshot.at(
      adminConnection,
      { itemId: orderItem.id },
    );
  typia.assert(snapshot);
  // 11. Verify snapshot contains ORIGINAL values frozen at purchase time
  TestValidator.equals(
    "snapshot SKU code matches original purchase-time value",
    snapshot.sku_code,
    originalCode,
  );
  TestValidator.equals(
    "snapshot price matches original purchase-time value",
    snapshot.price,
    originalPrice,
  );
  TestValidator.equals(
    "snapshot option values match original purchase-time values",
    snapshot.option_values,
    "Color: Red, Size: Large",
  );
}
