import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

/**
 * Test seller retrieval of a frozen product snapshot image from an order item they fulfilled.
 *
 * Orchestrates a complete purchase lifecycle spanning seller and customer actors. The seller creates a product with a gallery image and purchasable variant, then a customer places an order. At checkout, the system atomically captures immutable product snapshot image records preserving the exact image URL and display order as they appeared at purchase time.
 *
 * The seller retrieves a specific snapshot image via the scoped endpoint, and the response is validated against the original product data to confirm the snapshot provides an authoritative historical record — the image URL, display order, product name/description/basePrice/categoryName, and createdAt timestamp are all frozen at order placement time and never change regardless of subsequent edits to the live product.
 *
 * 1. Seller registers, creates a product, adds a purchasable variant, restocks inventory, and uploads a gallery image.
 * 2. Customer registers, adds the variant to cart, and places an order.
 * 3. Seller retrieves a snapshot image from the order item's product snapshot.
 * 4. Validates frozen imageUrl, displayOrder, productSnapshot summary fields, and createdAt timestamp.
 */
export async function test_api_seller_snapshot_image_retrieve_own_order_item(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup: register and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create a product owned by the seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create a purchasable variant with a globally unique SKU code
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  // 4. Add positive stock to the variant so it becomes purchasable
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    { params: { productId: product.id, variantId: variant.id } },
  );
  // 5. Upload an image to the product gallery
  const uploadedImage =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(uploadedImage);
  // 6. Customer setup: register and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 7. Add the variant to the customer's cart
  await generate_random_shopping_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 1,
      },
    },
  );
  // 8. Place the order — system creates product snapshot images atomically
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [{ variant_id: variant.id, quantity: 1 }],
      },
    },
  );
  typia.assert(order);
  // 9. Extract the order item and its product snapshot image
  const orderItem = order.items[0];
  typia.assert(orderItem);
  const productSnapshot = typia.assert(orderItem.productSnapshot!);
  const frozenImages = productSnapshot.productSnapshotImages;
  TestValidator.predicate(
    "snapshot contains at least one image",
    frozenImages.length > 0,
  );
  const snapshotImage = frozenImages[0];
  // 10. Seller retrieves the frozen snapshot image by scoped ID
  const retrievedImage =
    await api.functional.shoppingMall.seller.order_items.product_snapshot.images.at(
      sellerConnection,
      {
        itemId: orderItem.id,
        imageId: snapshotImage.id,
      },
    );
  typia.assert(retrievedImage);
  // 11. Validate frozen data matches the original state at order placement
  TestValidator.equals(
    "frozen imageUrl matches uploaded image",
    retrievedImage.imageUrl,
    uploadedImage.image_url,
  );
  TestValidator.equals(
    "frozen displayOrder matches gallery position",
    retrievedImage.displayOrder,
    uploadedImage.display_order satisfies number as number,
  );
  TestValidator.equals(
    "productSnapshot name frozen at order time",
    retrievedImage.productSnapshot.name,
    product.name,
  );
  TestValidator.equals(
    "productSnapshot description frozen at order time",
    retrievedImage.productSnapshot.description,
    product.description,
  );
  TestValidator.equals(
    "productSnapshot basePrice frozen at order time",
    retrievedImage.productSnapshot.basePrice,
    product.base_price,
  );
  TestValidator.equals(
    "productSnapshot categoryName frozen at order time",
    retrievedImage.productSnapshot.categoryName,
    product.category.name,
  );
  TestValidator.equals(
    "createdAt matches order creation time",
    retrievedImage.createdAt,
    order.created_at,
  );
}
