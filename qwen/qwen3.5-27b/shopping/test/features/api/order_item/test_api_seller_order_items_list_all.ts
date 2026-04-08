import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that a seller can view all order items within an order containing their products.
 *
 * Validates the complete order creation flow including seller authentication, product and variant creation, customer authentication, cart management, checkout, and order items retrieval. Ensures that sellers can access order items for orders containing their products with correct pagination and item details.
 *
 * Special attention is given to verifying that the order items response includes all required fields: quantity, price, status, order summary, product variant details, and seller information. The test also validates pagination metadata accuracy.
 *
 * 1. Seller registers and authenticates with email and credentials.
 * 2. Seller creates a product with name, description, and base price.
 * 3. Seller creates a product variant with SKU code, options, and initial stock quantity.
 * 4. Customer registers and authenticates with email and credentials.
 * 5. Customer adds the seller's product variant to their shopping cart.
 * 6. Customer places an order through checkout with shipping address and payment.
 * 7. Seller retrieves order items for the created order using the index endpoint.
 * 8. Validates that the response contains the expected order item with correct quantity, price, and status.
 * 9. Validates that pagination metadata is accurate (current page, limit, total records, total pages).
 * 10. Validates that order item includes order summary, product variant details, and seller information.
 */
export async function test_api_seller_order_items_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Seller creates a product
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Seller creates a product variant
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          variantOptions: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
          initialStockQuantity: 10,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 5. Customer adds variant to cart
  const cartItem = await api.functional.shoppingMall.customer.cart.items.create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 2,
      } satisfies IShoppingMallCustomerCartItem.ICreate,
    },
  );
  typia.assert(cartItem);
  // 6. Customer places order through checkout
  const order = await api.functional.shoppingMall.customer.checkout(
    customerConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        payment_token: "test_payment_token_12345",
      } satisfies IShoppingMallCheckout.ICreate,
    },
  );
  typia.assert(order);
  // 7. Seller retrieves order items
  const orderItemsResponse =
    await api.functional.shoppingMall.seller.orders.items.index(
      sellerConnection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(orderItemsResponse);
  // 8. Validate response structure
  TestValidator.predicate(
    "response contains pagination metadata",
    orderItemsResponse.pagination.current >= 1 &&
      orderItemsResponse.pagination.limit >= 1 &&
      orderItemsResponse.pagination.records >= 0 &&
      orderItemsResponse.pagination.pages >= 0,
  );
  // 9. Validate order items data
  TestValidator.predicate(
    "order items array is not empty",
    orderItemsResponse.data.length > 0,
  );
  // 10. Validate first order item details
  const firstItem = orderItemsResponse.data[0];
  TestValidator.equals(
    "order item quantity matches cart item",
    firstItem.quantity,
    cartItem.quantity,
  );
  TestValidator.equals(
    "order item price matches variant price",
    firstItem.price,
    variant.price ?? product.base_price,
  );
  TestValidator.equals("order item status is paid", firstItem.status, "paid");
  TestValidator.equals(
    "order item belongs to correct order",
    firstItem.order.id,
    order.id,
  );
  TestValidator.equals(
    "order item references correct product variant",
    firstItem.productVariant.id,
    variant.id,
  );
  TestValidator.equals(
    "order item references correct seller",
    firstItem.seller.id,
    (
      await authorize_seller_login(sellerConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "1234",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        },
      })
    ).id,
  );
}
