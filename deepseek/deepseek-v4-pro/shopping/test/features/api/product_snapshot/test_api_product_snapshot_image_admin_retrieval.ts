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
 * Test that an administrator can retrieve a specific frozen product snapshot image
 * from an order item's product snapshot.
 *
 * Validates the complete order lifecycle: an admin creates a product category,
 * a seller creates a product with a purchasable variant and stock, a customer
 * places an order — which automatically captures snapshot images at purchase time.
 * A snapshot image record is explicitly added to the order item's product snapshot,
 * and the admin retrieves it by its ID scoped to the correct order item.
 *
 * The test confirms that all expected fields are present and frozen at order
 * placement time: the image's id (UUID), imageUrl (immutable URL), displayOrder
 * (gallery position), createdAt (immutable timestamp), and the productSnapshot
 * summary with the frozen product name, description, basePrice, and categoryName.
 *
 * 1. Administrator authenticates via registration.
 * 2. Seller authenticates via registration and creates a category/product/variant/stock.
 * 3. Customer authenticates via registration and places an order.
 * 4. A snapshot image is explicitly created in the order item's product snapshot.
 * 5. Administrator retrieves the snapshot image and validates all frozen fields.
 */
export async function test_api_product_snapshot_image_admin_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 4. Admin creates a product category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 5. Seller creates a product under the category
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 6. Seller creates a variant for the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 7. Seller adds stock to the variant via inventory record
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      params: {
        productId: product.id,
        variantId: variant.id,
      },
    },
  );
  // 8. Customer places an order containing the variant
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
  const orderItem = order.items[0];
  // 9. Explicitly create a snapshot image record in the order item's product snapshot
  const snapshotImage =
    await generate_random_shopping_mall_order_items_product_snapshot_images_create(
      adminConnection,
      {
        params: { itemId: orderItem.id },
      },
    );
  typia.assert(snapshotImage);
  // 10. Admin retrieves the snapshot image by its ID scoped to the order item
  const retrieved =
    await api.functional.shoppingMall.admin.order_items.product_snapshot.images.at(
      adminConnection,
      {
        itemId: orderItem.id,
        imageId: snapshotImage.id,
      },
    );
  typia.assert(retrieved);
  // 11. Validate the retrieved snapshot image fields
  TestValidator.equals("image id matches", retrieved.id, snapshotImage.id);
  TestValidator.equals(
    "image url frozen at purchase time",
    retrieved.imageUrl,
    snapshotImage.imageUrl,
  );
  TestValidator.equals(
    "display order frozen at purchase time",
    retrieved.displayOrder,
    snapshotImage.displayOrder,
  );
  TestValidator.equals(
    "created at frozen at purchase time",
    retrieved.createdAt,
    snapshotImage.createdAt,
  );
  // Validate productSnapshot summary contains frozen product data
  const ps = retrieved.productSnapshot;
  TestValidator.equals(
    "product snapshot id matches",
    ps.id,
    snapshotImage.productSnapshot.id,
  );
  TestValidator.predicate(
    "product snapshot has frozen name",
    ps.name.length > 0,
  );
  TestValidator.predicate(
    "product snapshot has frozen description",
    ps.description.length > 0,
  );
  TestValidator.predicate(
    "product snapshot has frozen base price",
    ps.basePrice > 0,
  );
  TestValidator.predicate(
    "product snapshot has frozen category name",
    ps.categoryName.length > 0,
  );
  TestValidator.predicate(
    "product snapshot createdAt is frozen",
    ps.createdAt.length > 0,
  );
}
