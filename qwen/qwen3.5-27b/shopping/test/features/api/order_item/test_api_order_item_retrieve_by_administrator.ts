import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test that an authenticated administrator can retrieve complete details of a specific order item by its unique identifier.
 *
 * Validates the complete order item retrieval flow including administrative authentication, seller product creation, customer order placement, and order item detail access. Ensures that the order item correctly contains all required fields including immutable snapshot data capturing the product, variant, and seller information exactly as they existed when the order was placed.
 *
 * Special attention is given to verifying that snapshot data (product_name, product_description, variant_sku_code, variant_price, seller_shop_name, seller_shop_description) is preserved and matches the state at order placement time. The test also validates that product images and variant options are correctly captured in the snapshot.
 *
 * 1. Administrator registers and authenticates to the platform.
 * 2. Seller registers and authenticates to create products.
 * 3. Customer registers and authenticates to place orders.
 * 4. Seller creates a product with variants.
 * 5. Customer adds product variant to cart.
 * 6. Customer places order through checkout process.
 * 7. Administrator retrieves order item details by ID.
 * 8. Validates all required fields and snapshot data are present.
 */
export async function test_api_order_item_retrieve_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 4. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 5. Customer adds product variant to cart
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: product.variants[0]?.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // 6. Customer places order through checkout
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {},
  );
  typia.assert(order);
  // 7. Extract order item ID from the created order
  const orderItemId: string = order.items[0].id;
  TestValidator.predicate(
    "order has at least one item",
    order.items.length > 0,
  );
  // 8. Administrator retrieves order item details
  const orderItem =
    await api.functional.shoppingMall.administrator.order_items.at(
      adminConnection,
      {
        itemId: orderItemId,
      },
    );
  typia.assert(orderItem);
  // 9. Validate order item core fields
  TestValidator.equals("order item id matches", orderItem.id, orderItemId);
  TestValidator.equals("quantity matches cart", orderItem.quantity, 1);
  TestValidator.predicate("price is positive", orderItem.price > 0);
  TestValidator.equals("status is paid", orderItem.status, "paid");
  TestValidator.predicate("created_at exists", orderItem.created_at !== null);
  TestValidator.predicate("updated_at exists", orderItem.updated_at !== null);
  TestValidator.equals("deleted_at is null", orderItem.deleted_at, null);
  // 10. Validate order summary
  TestValidator.predicate(
    "order summary exists",
    orderItem.order !== null && orderItem.order !== undefined,
  );
  TestValidator.equals(
    "order number matches",
    orderItem.order.order_number,
    order.order_number,
  );
  TestValidator.predicate(
    "order total_price is positive",
    orderItem.order.total_price > 0,
  );
  TestValidator.equals(
    "item count matches",
    orderItem.order.item_count,
    order.items.length,
  );
  // 11. Validate product variant summary
  TestValidator.predicate(
    "product variant exists",
    orderItem.productVariant !== null && orderItem.productVariant !== undefined,
  );
  TestValidator.equals(
    "variant sku_code matches",
    orderItem.productVariant.sku_code,
    product.variants[0]?.sku_code,
  );
  TestValidator.predicate(
    "variant has stock_quantity",
    orderItem.productVariant.stock_quantity >= 0,
  );
  // 12. Validate seller summary
  TestValidator.predicate(
    "seller exists",
    orderItem.seller !== null && orderItem.seller !== undefined,
  );
  TestValidator.predicate(
    "seller has email",
    orderItem.seller.email !== null && orderItem.seller.email !== undefined,
  );
  TestValidator.predicate(
    "seller has approval_status",
    orderItem.seller.approval_status !== null &&
      orderItem.seller.approval_status !== undefined,
  );
  // 13. Validate immutable snapshot data
  TestValidator.predicate(
    "product_name exists",
    orderItem.product_name !== null && orderItem.product_name !== undefined,
  );
  TestValidator.equals(
    "product_name matches",
    orderItem.product_name,
    product.name,
  );
  TestValidator.predicate(
    "product_description exists",
    orderItem.product_description !== null &&
      orderItem.product_description !== undefined,
  );
  TestValidator.equals(
    "product_description matches",
    orderItem.product_description,
    product.description,
  );
  TestValidator.equals(
    "variant_sku_code matches",
    orderItem.variant_sku_code,
    product.variants[0]?.sku_code,
  );
  TestValidator.equals(
    "variant_price matches",
    orderItem.variant_price,
    orderItem.price,
  );
  TestValidator.predicate(
    "seller_shop_name exists",
    orderItem.seller_shop_name !== null &&
      orderItem.seller_shop_name !== undefined,
  );
  // 14. Validate product images snapshot
  TestValidator.predicate(
    "images array exists",
    orderItem.images !== null && orderItem.images !== undefined,
  );
  TestValidator.predicate("images is array", Array.isArray(orderItem.images));
  // 15. Validate variant options snapshot
  TestValidator.predicate(
    "variantOptions array exists",
    orderItem.variantOptions !== null && orderItem.variantOptions !== undefined,
  );
  TestValidator.predicate(
    "variantOptions is array",
    Array.isArray(orderItem.variantOptions),
  );
}
