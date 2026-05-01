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
import { generate_random_shopping_mall_order_items_product_snapshot_images_create } from "../../../generate/generate_random_shopping_mall_order_items_product_snapshot_images_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_order_item_product_snapshot_image } from "../../../prepare/prepare_random_shopping_mall_order_item_product_snapshot_image";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

/**
 * Test that an administrator can retrieve a product snapshot image after the original product is deleted.
 *
 * Validates the platform's ability to maintain complete historical records for dispute resolution and audit purposes, regardless of later product lifecycle changes. When a seller soft-deletes a product, live product images are removed but snapshot references captured at order placement time are preserved immutably.
 *
 * The test verifies that the admin can access the frozen snapshot image — with id, imageUrl, displayOrder, createdAt, and productSnapshot reference all intact — even after the original product no longer exists. This confirms that denormalized snapshot data (product name, description, basePrice, categoryName) survives cascading deletion.
 *
 * 1. Admin registers and creates a product category.
 * 2. Seller registers, creates a product under the category, adds a variant with stock.
 * 3. Customer registers and places an order containing the variant — snapshots are captured automatically.
 * 4. A snapshot image record is created under the order item's product snapshot.
 * 5. Seller soft-deletes the product, cascading to remove live images but preserving snapshots.
 * 6. Admin retrieves the snapshot image by itemId and imageId from the admin endpoint.
 * 7. Validates all snapshot image fields remain intact and the productSnapshot reference is preserved.
 */
export async function test_api_product_snapshot_image_admin_retrieval_after_product_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Admin creates category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 4. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
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
      },
    );
  typia.assert(variant);
  // 6. Seller adds stock
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      params: {
        productId: product.id,
        variantId: variant.id,
      },
      body: {
        quantity_change: 100,
      },
    },
  );
  // 7. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 8. Customer places order — snapshots captured automatically
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
  // 9. Create snapshot image under the order item's product snapshot
  const orderItem = order.items[0];
  const snapshotImage =
    await generate_random_shopping_mall_order_items_product_snapshot_images_create(
      customerConnection,
      {
        params: { itemId: orderItem.id },
      },
    );
  typia.assert(snapshotImage);
  // 10. Seller soft-deletes the product
  await api.functional.shoppingMall.seller.products.erase(sellerConnection, {
    productId: product.id,
  });
  // 11. Admin retrieves the snapshot image after product deletion
  const retrievedImage =
    await api.functional.shoppingMall.admin.order_items.product_snapshot.images.at(
      adminConnection,
      {
        itemId: orderItem.id,
        imageId: snapshotImage.id,
      },
    );
  typia.assert(retrievedImage);
  // 12. Validate snapshot image survived product deletion
  TestValidator.equals(
    "snapshot image id preserved after product deletion",
    retrievedImage.id,
    snapshotImage.id,
  );
  TestValidator.equals(
    "snapshot image url preserved after product deletion",
    retrievedImage.imageUrl,
    snapshotImage.imageUrl,
  );
  TestValidator.equals(
    "snapshot image display order preserved after product deletion",
    retrievedImage.displayOrder,
    snapshotImage.displayOrder,
  );
  TestValidator.equals(
    "snapshot image createdAt preserved after product deletion",
    retrievedImage.createdAt,
    snapshotImage.createdAt,
  );
  TestValidator.predicate(
    "snapshot image has productSnapshot reference",
    retrievedImage.productSnapshot !== null,
  );
  TestValidator.predicate(
    "productSnapshot contains frozen product name",
    retrievedImage.productSnapshot.name.length > 0,
  );
  TestValidator.predicate(
    "productSnapshot contains frozen base price",
    retrievedImage.productSnapshot.basePrice > 0,
  );
}
