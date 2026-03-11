import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_customer_checkout_complete } from "../../../generate/generate_random_shopping_mall_customer_checkout_complete";
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { generate_random_shopping_mall_customer_customers_orders_items_cancellation_request_request } from "../../../generate/generate_random_shopping_mall_customer_customers_orders_items_cancellation_request_request";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_variants_inventory_adjust } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_adjust";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test customer retrieving their own cancellation request successfully.
 *
 * This test verifies that an authenticated customer can retrieve complete
 * details of a cancellation request they created for their own order item.
 *
 * Flow:
 * 1. Admin creates category
 * 2. Seller creates product, variant, and inventory
 * 3. Customer adds to cart and completes checkout
 * 4. Customer creates cancellation request
 * 5. Customer retrieves the cancellation request
 */
export async function test_api_cancellation_request_retrieve_owned_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create administrator and category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // Step 2: Create seller, product, variant, and inventory
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          categoryId: category.id,
        },
      },
    );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  const inventory =
    await generate_random_shopping_mall_seller_variants_inventory_adjust(
      sellerConnection,
      {
        params: {
          variantId: variant.id,
        },
        body: {
          quantity_change: 100,
          reason: "Initial stock",
        },
      },
    );
  typia.assert(inventory);
  // Step 3: Create customer and complete order flow
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Add item to cart
  const cartItem =
    await generate_random_shopping_mall_customer_customers_cart_items_create(
      customerConnection,
      {
        body: {
          variantId: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // Complete checkout - use random address ID
  // Note: In production, address must exist. For testing, we use a mock address.
  const order = await generate_random_shopping_mall_customer_checkout_complete(
    customerConnection,
    {
      body: {
        addressId: typia.random<string>(),
      },
    },
  );
  typia.assert(order);
  // Step 4: Create cancellation request
  const orderItem = order.orderItems[0];
  typia.assertGuard(orderItem);
  const cancellationReason = RandomGenerator.paragraph({ sentences: 3 });
  const cancellationRequest =
    await generate_random_shopping_mall_customer_customers_orders_items_cancellation_request_request(
      customerConnection,
      {
        params: {
          orderId: order.id,
          itemId: orderItem.id,
        },
        body: {
          reason: cancellationReason,
        },
      },
    );
  typia.assert(cancellationRequest);
  // Step 5: Retrieve the cancellation request
  const retrieved =
    await api.functional.shoppingMall.customer.cancellation_requests.at(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(retrieved);
  // Validate basic fields
  TestValidator.equals(
    "cancellation request id",
    retrieved.id,
    cancellationRequest.id,
  );
  TestValidator.equals("reason matches", retrieved.reason, cancellationReason);
  TestValidator.equals("status is pending", retrieved.status, "pending");
  TestValidator.equals(
    "updated_at equals created_at",
    retrieved.updated_at,
    retrieved.created_at,
  );
  TestValidator.equals("responded_at is null", retrieved.responded_at, null);
  TestValidator.equals("seller is null", retrieved.seller, null);
  // Validate orderItem nested structure
  TestValidator.equals(
    "orderItem id matches",
    retrieved.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "orderItem quantity",
    retrieved.orderItem.quantity,
    orderItem.quantity,
  );
  TestValidator.equals(
    "orderItem price",
    retrieved.orderItem.price,
    orderItem.price,
  );
  TestValidator.equals("orderItem status", retrieved.orderItem.status, "paid");
  // Validate nested product reference
  TestValidator.equals(
    "product id",
    retrieved.orderItem.product.id,
    product.id,
  );
  TestValidator.equals(
    "product name",
    retrieved.orderItem.product.name,
    product.name,
  );
  // Validate nested variant reference
  TestValidator.equals(
    "variant id",
    retrieved.orderItem.variant.id,
    variant.id,
  );
  // Validate nested seller reference
  TestValidator.equals(
    "seller id",
    retrieved.orderItem.seller.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "seller shop name",
    retrieved.orderItem.seller.shop_name,
    sellerAuth.shop_name,
  );
  // Validate order reference
  TestValidator.equals("order id", retrieved.orderItem.order.id, order.id);
  TestValidator.equals(
    "order orderNumber",
    retrieved.orderItem.order.orderNumber,
    order.orderNumber,
  );
}
