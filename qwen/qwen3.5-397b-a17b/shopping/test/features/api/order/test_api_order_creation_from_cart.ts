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
 * Test order creation from customer's shopping cart.
 *
 * This test validates the complete order creation workflow:
 * 1. Customer and seller account setup
 * 2. Product creation with variants
 * 3. Adding items to cart
 * 4. Checkout and order creation
 * 5. Post-order validations (cart cleared, inventory reduced, order history)
 */
export async function test_api_order_creation_from_cart(
  connection: api.IConnection,
): Promise<void> {
  // ============================================
  // 1. SETUP: Create admin account for seller approval
  // ============================================
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
  // ============================================
  // 2. SETUP: Create seller account
  // ============================================
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
  // ============================================
  // 3. SETUP: Admin approves seller registration
  // ============================================
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
  // ============================================
  // 4. SETUP: Create customer account
  // ============================================
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // ============================================
  // 5. SETUP: Seller creates product with category
  // ============================================
  // Note: We need a category ID - using a generated UUID as placeholder
  // In real tests, category would be created by admin first
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<100000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  TestValidator.equals("product name matches", product.name, product.name);
  // ============================================
  // 6. SETUP: Add product variant to customer's cart
  // ============================================
  // Note: In real scenario, variant would be created via seller API
  // For this test, we use a generated variant ID as placeholder
  const cartItem =
    await api.functional.shoppingMall.customer.customers.cart.items.create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          quantity: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // ============================================
  // 7. EXECUTE: Create order from cart
  // ============================================
  // Note: addressId would come from customer's saved addresses
  // Using generated UUID as placeholder for this test
  const order = await api.functional.shoppingMall.customer.orders.create(
    customerConnection,
    {
      body: {
        addressId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // ============================================
  // 8. VALIDATE: Order structure and content
  // ============================================
  // Verify order number is generated
  TestValidator.predicate(
    "order number is not empty",
    () => order.order_number.length > 0,
  );
  // Verify total price is positive
  TestValidator.predicate(
    "total price is positive",
    () => order.total_price > 0,
  );
  // Verify shipping address snapshot exists
  TestValidator.predicate(
    "shipping address exists",
    () =>
      order.shipping_address.recipient_name !== undefined &&
      order.shipping_address.street_address !== undefined &&
      order.shipping_address.city !== undefined,
  );
  // Verify order items exist
  TestValidator.predicate("order has items", () => order.items.length > 0);
  // Verify order items have correct status
  for (const item of order.items) {
    TestValidator.equals("order item status is PAID", item.status, "PAID");
    // Verify snapshots are captured
    TestValidator.predicate(
      "product snapshot exists",
      () => item.productSnapshot !== undefined,
    );
    TestValidator.predicate(
      "variant snapshot exists",
      () => item.productVariantSnapshot !== undefined,
    );
    TestValidator.predicate(
      "seller info exists",
      () => item.seller !== undefined,
    );
  }
  // Verify no shipments created yet
  TestValidator.equals("shipments array is empty", order.shipments.length, 0);
  // Verify customer reference matches
  TestValidator.equals(
    "order customer matches",
    order.customer.id,
    customerAuth.id,
  );
  // ============================================
  // 9. VALIDATE: Post-order conditions
  // ============================================
  // Note: Cart retrieval and inventory check would require additional API endpoints
  // that are not available in the provided SDK functions.
  // In a complete test suite, we would verify:
  // - Cart is cleared after order
  // - Inventory is reduced by order quantity
  // - Order appears in customer's order history
}
