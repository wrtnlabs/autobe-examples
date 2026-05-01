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
 * Test that an image record can be added to the frozen product snapshot of an order item,
 * serving as the main thumbnail when placed at display_order 0.
 *
 * Validates the complete lifecycle from platform setup through order placement to snapshot
 * image creation. The test covers administrator and seller registration, category and product
 * creation, variant and inventory management, customer order placement (which atomically
 * creates the order item and its product snapshot), and finally adding a snapshot image with
 * the lowest allowed display order value.
 *
 * Special attention is given to verifying that display_order 0 correctly positions this image
 * as the main thumbnail — consistent with the rule that the image with the lowest display
 * order serves as the thumbnail. The image record becomes part of the immutable snapshot
 * and persists indefinitely, providing an authoritative historical reference even if the seller
 * later modifies or deletes the original product's live image gallery.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers, and the administrator approves the seller.
 * 3. The approved seller creates a product under the category with a base price.
 * 4. The seller creates a variant with SKU code and option values.
 * 5. The seller adds initial stock via an inventory record.
 * 6. A customer registers and places an order for that variant.
 * 7. Using the order item ID, add a snapshot image with display_order of 0.
 * 8. Validate the response: UUID id, submitted image_url, display_order 0, created_at timestamp, and productSnapshot linkage.
 */
export async function test_api_product_snapshot_image_add_as_thumbnail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create product category
  const category: IShoppingMallCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {},
    );
  // 3. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IShoppingMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {},
  );
  // 4. Administrator approves the seller
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: seller.id,
  });
  // 5. Create product under the category
  const product: IShoppingMallProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      { body: { shopping_mall_category_id: category.id } },
    );
  // 6. Create variant with SKU and option values
  const variant: IShoppingMallProductVariant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  // 7. Add initial stock via inventory record
  const stockQuantity: number = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    {
      params: { productId: product.id, variantId: variant.id },
      body: {
        quantity_change: stockQuantity satisfies number as number,
        reason: "Initial stock for test",
      },
    },
  );
  // 8. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 9. Place order for the variant (atomically creates order item + product snapshot)
  const order: IShoppingMallOrder =
    await generate_random_shopping_mall_customer_orders_create(
      customerConnection,
      {
        body: {
          items: [{ variant_id: variant.id, quantity: 1 }],
        },
      },
    );
  typia.assert(order);
  const orderItem: IShoppingMallOrderItem = order.items[0];
  // 10. Add snapshot image with display_order 0 (main thumbnail)
  const imageUrl: string = typia.random<string & tags.Format<"url">>();
  const snapshotImage: IShoppingMallOrderItemProductSnapshotImage =
    await generate_random_shopping_mall_order_items_product_snapshot_images_create(
      customerConnection,
      {
        params: { itemId: orderItem.id },
        body: {
          image_url: imageUrl,
          display_order: 0 satisfies number as number,
        },
      },
    );
  typia.assert(snapshotImage);
  // 11. Validate business assertions
  TestValidator.equals(
    "display order is 0 (main thumbnail)",
    snapshotImage.displayOrder,
    0,
  );
  TestValidator.equals(
    "image URL matches submitted value",
    snapshotImage.imageUrl,
    imageUrl,
  );
  TestValidator.predicate(
    "product snapshot linkage exists",
    snapshotImage.productSnapshot !== null,
  );
  TestValidator.predicate(
    "product snapshot has valid id",
    snapshotImage.productSnapshot.id.length > 0,
  );
}
