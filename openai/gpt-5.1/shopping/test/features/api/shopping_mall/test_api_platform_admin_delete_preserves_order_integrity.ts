import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";

/**
 * Verify that deleting a customer cart as a platform admin does not invalidate
 * or corrupt an order that was created from that cart.
 *
 * Business intent:
 *
 * - A customer can build a cart and place an order from it.
 * - After the order exists, operations staff (platform admin) may clean up old
 *   carts.
 * - Deleting the cart must not break order access or its monetary snapshot, and
 *   the order should still remember which cart it originated from.
 *
 * Step-by-step process:
 *
 * 1. Customer self-registers and becomes the authenticated actor.
 * 2. Customer creates a persistent cart.
 * 3. Customer adds at least one item line to the cart.
 * 4. Customer creates an order referencing this cart, passing a consistent
 *    monetary snapshot into IShoppingMallOrder.ICreate.
 * 5. Capture the created order and validate key fields.
 * 6. Register a platform admin (switching Authorization header).
 * 7. As admin, delete the original customer cart by id.
 * 8. As admin, re-fetch the order by id and verify that:
 *
 *    - It is still accessible and structurally valid.
 *    - Its id matches the original order id.
 *    - Its monetary totals match the snapshot used at creation.
 *    - Origin_customer_cart_id is still the original cart.id.
 */
export async function test_api_platform_admin_delete_preserves_order_integrity(
  connection: api.IConnection,
) {
  // 1. Customer self-registration (join)
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://customer.example.com/signup",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  // 2. Customer creates a persistent cart
  const cartCreateBody = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: {
      source: "e2e-test",
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: cartCreateBody,
      },
    );
  typia.assert<IShoppingMallCustomerCart>(cart);

  // 3. Customer adds an item to the cart
  const cartItemCreateBody = {
    skuId: typia.random<string & tags.Format<"uuid">>(),
    quantity: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    note: "E2E test line item",
  } satisfies IShoppingMallCustomerCartItem.ICreate;

  const cartItem: IShoppingMallCustomerCartItem =
    await api.functional.shoppingMall.customer.customerCarts.items.create(
      connection,
      {
        customerCartId: cart.id,
        body: cartItemCreateBody,
      },
    );
  typia.assert<IShoppingMallCustomerCartItem>(cartItem);

  // 4. Prepare a consistent order snapshot and create order from cart
  const itemsSubtotal = 100;
  const discountTotal = 10;
  const shippingTotal = 5;
  const taxTotal = 9;
  const grandTotal = itemsSubtotal - discountTotal + shippingTotal + taxTotal;

  const orderCreateBody = {
    customer_cart_id: cart.id,
    currency_code: cart.currency_code,
    items_subtotal_amount: itemsSubtotal,
    discount_total_amount: discountTotal,
    shipping_total_amount: shippingTotal,
    tax_total_amount: taxTotal,
    grand_total_amount: grandTotal,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: "Please deliver during business hours",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert<IShoppingMallOrder>(order);

  // Business-level validations on the created order
  TestValidator.equals(
    "order.origin_customer_cart_id matches cart.id",
    order.origin_customer_cart_id,
    cart.id,
  );
  TestValidator.equals(
    "order currency_code matches cart currency_code",
    order.currency_code,
    cart.currency_code,
  );
  TestValidator.equals(
    "items_subtotal_amount snapshot matches",
    order.items_subtotal_amount,
    itemsSubtotal,
  );
  TestValidator.equals(
    "discount_total_amount snapshot matches",
    order.discount_total_amount,
    discountTotal,
  );
  TestValidator.equals(
    "shipping_total_amount snapshot matches",
    order.shipping_total_amount,
    shippingTotal,
  );
  TestValidator.equals(
    "tax_total_amount snapshot matches",
    order.tax_total_amount,
    taxTotal,
  );
  TestValidator.equals(
    "grand_total_amount snapshot matches",
    order.grand_total_amount,
    grandTotal,
  );

  // Capture a copy of the order snapshot for comparison after cart deletion
  const originalOrderSnapshot: IShoppingMallOrder = order;

  // 5. Register a platform admin (this call also authenticates the admin)
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(platformAdmin);

  // 6. As admin, delete the original customer cart
  await api.functional.shoppingMall.platformAdmin.customerCarts.erase(
    connection,
    {
      customerCartId: cart.id,
    },
  );

  // 7. As admin, re-fetch the order and validate integrity
  const reloadedOrder: IShoppingMallOrder =
    await api.functional.shoppingMall.platformAdmin.orders.at(connection, {
      orderId: originalOrderSnapshot.id,
    });
  typia.assert<IShoppingMallOrder>(reloadedOrder);

  // Verify that order id is unchanged
  TestValidator.equals(
    "order id remains unchanged after cart deletion",
    reloadedOrder.id,
    originalOrderSnapshot.id,
  );

  // Verify that origin_customer_cart_id is preserved
  TestValidator.equals(
    "origin_customer_cart_id preserved after cart deletion",
    reloadedOrder.origin_customer_cart_id,
    originalOrderSnapshot.origin_customer_cart_id,
  );

  // Verify that monetary snapshots are unchanged
  TestValidator.equals(
    "items_subtotal_amount remains unchanged",
    reloadedOrder.items_subtotal_amount,
    originalOrderSnapshot.items_subtotal_amount,
  );
  TestValidator.equals(
    "discount_total_amount remains unchanged",
    reloadedOrder.discount_total_amount,
    originalOrderSnapshot.discount_total_amount,
  );
  TestValidator.equals(
    "shipping_total_amount remains unchanged",
    reloadedOrder.shipping_total_amount,
    originalOrderSnapshot.shipping_total_amount,
  );
  TestValidator.equals(
    "tax_total_amount remains unchanged",
    reloadedOrder.tax_total_amount,
    originalOrderSnapshot.tax_total_amount,
  );
  TestValidator.equals(
    "grand_total_amount remains unchanged",
    reloadedOrder.grand_total_amount,
    originalOrderSnapshot.grand_total_amount,
  );
}
