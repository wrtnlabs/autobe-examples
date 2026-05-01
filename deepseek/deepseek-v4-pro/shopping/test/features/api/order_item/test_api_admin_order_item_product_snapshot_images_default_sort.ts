import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemProductSnapshotImage";
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
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

/**
 * Test that product snapshot images are listed with default display_order ascending sort.
 *
 * Validates that when an administrator retrieves product snapshot images for an order item, the images are returned sorted by display_order in ascending order, replicating the exact gallery arrangement the customer saw at purchase time. The test sets up a complete purchase flow to create an order with immutable product snapshot images frozen at checkout.
 *
 * The test verifies pagination metadata correctness and ensures each image record contains all required fields: id, image_url, display_order, and created_at. Since snapshot images are immutable and never modified after order creation, the ordering and content should reflect the product state at the exact moment of purchase.
 *
 * 1. Administrator joins and creates a product category.
 * 2. Seller joins and is approved by the administrator.
 * 3. Seller creates a product with three images having sequential display orders, a purchasable variant, and inventory stock.
 * 4. Customer joins, adds the variant to cart, and places an order, triggering product snapshot creation with frozen images.
 * 5. Administrator calls the target endpoint with default pagination (page=1, no explicit sort).
 * 6. Validates response contains image records and they are sorted by display_order ascending.
 */
export async function test_api_admin_order_item_product_snapshot_images_default_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins and creates a product category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  // 2. Seller joins and is approved by the administrator
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: seller.id,
  });
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: { shopping_mall_category_id: category.id },
    },
  );
  // Upload multiple images with sequential display orders
  await generate_random_shopping_mall_seller_products_images_create(
    sellerConnection,
    {
      params: { productId: product.id },
    },
  );
  await generate_random_shopping_mall_seller_products_images_create(
    sellerConnection,
    {
      params: { productId: product.id },
    },
  );
  await generate_random_shopping_mall_seller_products_images_create(
    sellerConnection,
    {
      params: { productId: product.id },
    },
  );
  // Create a purchasable variant with inventory stock
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      params: { productId: product.id, variantId: variant.id },
    },
  );
  // 4. Customer joins, adds variant to cart, and places an order
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  await generate_random_shopping_mall_customer_cart_items_create(
    customerConnection,
    {
      body: { productVariantId: variant.id, quantity: 1 },
    },
  );
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: { items: [{ variant_id: variant.id, quantity: 1 }] },
    },
  );
  // 5. Administrator lists product snapshot images with default sort
  const orderItem = order.items[0];
  const result =
    await api.functional.shoppingMall.admin.order_items.product_snapshot.images.index(
      adminConnection,
      {
        itemId: orderItem.id,
        body: {
          page: 1,
        } satisfies IShoppingMallOrderItemProductSnapshotImage.IRequest,
      },
    );
  typia.assert(result);
  // 6. Validate images are sorted by display_order ascending
  TestValidator.predicate("has image records", result.data.length >= 1);
  for (let i = 1; i < result.data.length; i++) {
    TestValidator.predicate(
      `images sorted by display_order ascending at index ${i}`,
      result.data[i - 1].display_order <= result.data[i].display_order,
    );
  }
}
