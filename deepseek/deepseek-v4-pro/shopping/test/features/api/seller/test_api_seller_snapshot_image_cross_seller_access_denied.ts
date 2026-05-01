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
 * Test that a seller cannot access another seller's order item snapshot images.
 *
 * Validates the cross-seller access control for order item product snapshot images. When Seller A creates a product with an image, a customer purchases it, and the system captures snapshot images — Seller B should be denied access to those snapshot images with a 404 Not Found response.
 *
 * The enforcement relies on a chain verification: the snapshot image must belong to a product snapshot whose order item belongs to the requesting seller. Since the order item belongs to Seller A, Seller B's request fails the chain check and returns 404.
 *
 * 1. Seller A registers and creates a product with a purchasable variant (stocked) and a gallery image.
 * 2. A customer registers, adds the variant to their cart, and places an order.
 * 3. The system automatically captures immutable snapshot images under Seller A's order item.
 * 4. Seller B registers and attempts to GET the snapshot image using Seller A's order item ID and image ID.
 * 5. The request returns 404 Not Found, confirming cross-seller access is properly denied.
 */
export async function test_api_seller_snapshot_image_cross_seller_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller A joins
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, {});
  // 2. Seller A creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection,
    {},
  );
  typia.assert(product);
  // 3. Seller A creates variant with initial stock
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerAConnection,
      {
        params: { productId: product.id },
        body: { initialStockQuantity: 10 },
      },
    );
  typia.assert(variant);
  TestValidator.predicate(
    "variant has positive stock",
    variant.stock_quantity > 0,
  );
  // 4. Seller A uploads product image
  const image =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerAConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(image);
  // 5. Customer joins
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 6. Customer adds variant to cart
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: { productVariantId: variant.id, quantity: 1 },
      },
    );
  typia.assert(cartItem);
  TestValidator.predicate("cart item is available", cartItem.available);
  // 7. Customer places order — snapshot images are captured automatically
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [{ variant_id: variant.id, quantity: 1 }],
      },
    },
  );
  typia.assert(order);
  TestValidator.predicate("order has items", order.items.length > 0);
  // 8. Extract order item ID and snapshot image ID from the order
  const orderItem = order.items[0];
  typia.assert(orderItem);
  const itemId = orderItem.id;
  const productSnapshot = orderItem.productSnapshot;
  typia.assertGuard<IShoppingMallOrderItemProductSnapshot>(productSnapshot!);
  TestValidator.predicate(
    "product snapshot has images",
    productSnapshot.productSnapshotImages.length > 0,
  );
  const snapshotImage = productSnapshot.productSnapshotImages[0];
  typia.assert(snapshotImage);
  const imageId = snapshotImage.id;
  // 9. Seller B joins
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {});
  // 10. Seller B attempts to access Seller A's snapshot image → 404
  await TestValidator.httpError(
    "cross-seller access denied — returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.seller.order_items.product_snapshot.images.at(
        sellerBConnection,
        { itemId, imageId },
      );
    },
  );
}
