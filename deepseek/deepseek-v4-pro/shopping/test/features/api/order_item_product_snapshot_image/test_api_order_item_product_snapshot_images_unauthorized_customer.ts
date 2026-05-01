import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemProductSnapshotImage";
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
 * Test authorization enforcement for order item product snapshot images access.
 *
 * Validates that customers can only access product snapshot images for their own
 * order items. When a customer attempts to list snapshot images belonging to another
 * customer's order, the system must return a 403 Forbidden response without leaking
 * information about other customers' orders.
 *
 * The product snapshot images are frozen at order creation time and preserve the
 * exact product gallery as it appeared when the customer placed the order. These
 * images are immutable historical records and must be protected from unauthorized
 * cross-customer access.
 *
 * 1. A seller registers and creates a product with an image, variant, and inventory.
 * 2. Customer A registers, adds the variant to their cart, and places an order.
 * 3. The order placement automatically creates a product snapshot with frozen image records.
 * 4. Customer B registers — a completely separate customer with no relationship.
 * 5. Customer B attempts to list the product snapshot images for Customer A's order item.
 * 6. The system returns 403 Forbidden, enforcing that customers can only access
 *    snapshot images for items belonging to their own orders.
 */
export async function test_api_order_item_product_snapshot_images_unauthorized_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  await generate_random_shopping_mall_seller_products_images_create(
    sellerConnection,
    { params: { productId: product.id } },
  );
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
    sellerConnection,
    { params: { productId: product.id, variantId: variant.id } },
  );
  // 2. Customer A setup — register, add to cart, and place order
  const customerAConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerAConnection, {});
  await generate_random_shopping_mall_customer_cart_items_create(
    customerAConnection,
    { body: { productVariantId: variant.id, quantity: 1 } },
  );
  // 3. Customer A places order — product snapshot with frozen images created automatically
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerAConnection,
    { body: { items: [{ variant_id: variant.id, quantity: 1 }] } },
  );
  typia.assert(order);
  const orderItemId = order.items[0].id;
  // 4. Customer B registers — completely separate customer with no relationship to the order
  const customerBConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerBConnection, {});
  // 5. Customer B attempts unauthorized access to Customer A's order item snapshot images
  await TestValidator.httpError(
    "Customer B cannot access Customer A's order item product snapshot images",
    403,
    async () => {
      await api.functional.shoppingMall.customer.order_items.product_snapshot.images.index(
        customerBConnection,
        { itemId: orderItemId, body: {} },
      );
    },
  );
}
