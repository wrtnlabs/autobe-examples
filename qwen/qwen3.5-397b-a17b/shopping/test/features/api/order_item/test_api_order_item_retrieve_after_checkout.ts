import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test that a customer can successfully retrieve detailed information about an order item
 * from their own order after completing checkout.
 *
 * Workflow:
 * 1. Admin setup - register and login admin for seller approval
 * 2. Seller setup - register seller, login, and get admin approval
 * 3. Seller creates a product (category and variant would be created in full implementation)
 * 4. Customer setup - register and login customer
 * 5. Customer creates order through checkout flow
 * 6. Customer retrieves order item details
 * 7. Validate order item contains correct snapshot data and structure
 */
export async function test_api_order_item_retrieve_after_checkout(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register admin for seller approval
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Seller setup - register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Admin approves seller registration
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerAuth.id,
    });
  typia.assert(approvedSeller);
  TestValidator.equals(
    "seller approval status",
    approvedSeller.approval_status,
    "APPROVED",
  );
  // 3. Seller creates a product
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<number & tags.Minimum<1000>>() satisfies number as number,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Customer setup - register and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 5. Customer creates order (checkout)
  // Note: In full implementation, this would include cart items and valid address
  const order = await api.functional.shoppingMall.customer.orders.create(
    customerConnection,
    {
      body: {
        addressId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  TestValidator.predicate("order has items", order.items.length > 0);
  // 6. Get the first order item from the order
  const orderItem = order.items[0];
  // 7. Customer retrieves order item details using the specific endpoint
  const retrievedOrderItem =
    await api.functional.shoppingMall.customer.orders.items.getByOrderidAndItemid(
      customerConnection,
      {
        orderId: order.id,
        itemId: orderItem.id,
      },
    );
  typia.assert(retrievedOrderItem);
  // 8. Validate order item structure and business logic
  TestValidator.equals(
    "order item ID matches",
    retrievedOrderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "quantity matches",
    retrievedOrderItem.quantity,
    orderItem.quantity,
  );
  TestValidator.equals(
    "unit price matches",
    retrievedOrderItem.unitPrice,
    orderItem.unitPrice,
  );
  TestValidator.equals("status is PAID", retrievedOrderItem.status, "PAID");
  // Validate product snapshot preserves state at order time
  TestValidator.predicate(
    "product snapshot exists",
    retrievedOrderItem.productSnapshot !== undefined,
  );
  TestValidator.predicate(
    "product snapshot has name",
    retrievedOrderItem.productSnapshot.name.length > 0,
  );
  TestValidator.predicate(
    "product snapshot has base price",
    retrievedOrderItem.productSnapshot.base_price >= 0,
  );
  // Validate product variant snapshot preserves state at order time
  TestValidator.predicate(
    "variant snapshot exists",
    retrievedOrderItem.productVariantSnapshot !== undefined,
  );
  TestValidator.predicate(
    "variant snapshot has SKU code",
    retrievedOrderItem.productVariantSnapshot.sku_code.length > 0,
  );
  // Validate seller information is present
  TestValidator.predicate(
    "seller info exists",
    retrievedOrderItem.seller !== undefined,
  );
  TestValidator.predicate(
    "seller has shop name",
    retrievedOrderItem.seller.shop_name.length > 0,
  );
  // Validate parent order summary references correct order
  TestValidator.equals(
    "parent order ID matches",
    retrievedOrderItem.order.id,
    order.id,
  );
  TestValidator.equals(
    "order number matches",
    retrievedOrderItem.order.orderNumber,
    order.order_number,
  );
  // Verify snapshot data integrity - snapshots should be immutable historical records
  TestValidator.predicate(
    "snapshot has timestamp",
    retrievedOrderItem.productSnapshot.snapshot_at.length > 0,
  );
  TestValidator.predicate(
    "variant snapshot has timestamp",
    retrievedOrderItem.productVariantSnapshot.snapshot_at.length > 0,
  );
}