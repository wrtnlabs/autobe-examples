import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";

/**
 * Validate deletion behavior for inactive or converted customer carts.
 *
 * Business goal
 *
 * - Ensure that a customer can delete a cart that is no longer active for
 *   shopping (e.g., explicitly marked inactive) without impacting any orders
 *   that were created from that cart.
 * - Confirm that the platform behaves consistently when a cart that has already
 *   contributed to an order is deleted: the cart disappears as a
 *   working-shoppable entity, but the order retains its snapshot and origin
 *   link.
 *
 * Happy-path scenario
 *
 * 1. Customer self-registers using auth.customer.join, which also establishes the
 *    authenticated customer context.
 * 2. The customer creates a new persistent cart via
 *    shoppingMall.customer.customerCarts.create. We expect the resulting cart
 *    to be active by default (`is_active === true`) and to contain
 *    server-managed totals.
 * 3. The customer explicitly updates the cart via
 *    shoppingMall.customer.customerCarts.update, setting `is_active` to false.
 *    The response should reflect `is_active === false` and preserve the same
 *    cart `id` and monetary snapshot fields.
 * 4. Using this now-inactive cart, the customer creates an order via
 *    shoppingMall.customer.orders.create by:
 *
 *    - Passing the cart `id` in `customer_cart_id`.
 *    - Providing consistent snapshot monetary values derived from the cart totals
 *         (subtotal/discount/shipping/tax/total) so that the backend accepts
 *         the order.
 *    - Supplying random but structurally valid UUIDs for `shipping_address_id` and
 *         `billing_address_id` (we treat them as pre-existing snapshots for the
 *         purposes of this E2E, as there are no dedicated address APIs exposed
 *         in this test scope).
 * 5. After successful order creation, the customer calls
 *    shoppingMall.customer.customerCarts.erase with the same `customerCartId`.
 *    The call is expected to succeed (no HttpError thrown) and return void.
 * 6. We then validate logical consistency:
 *
 *    - The previously created order object in memory still carries the same `id` and
 *         monetary snapshot fields.
 *    - If `origin_customer_cart_id` is present on the order, it must equal the
 *         deleted cart id, demonstrating that the order retains a reference to
 *         its source cart even though the cart itself has been deleted.
 *
 * Non-goals and omitted negative tests
 *
 * - We do NOT attempt to verify HTTP status codes (e.g., 400/409) for deleting
 *   active carts or other customers' carts, because status-code testing is out
 *   of scope and there is no cart lookup/index API in the provided SDK that
 *   would let us reliably find or simulate such scenarios.
 * - We do NOT perform any type-error or missing-field validation tests, as these
 *   are explicitly forbidden. All request bodies use the exact DTO types with
 *   correct field shapes.
 *
 * Assertions
 *
 * - Typia.assert() is called on all non-void API responses to guarantee contract
 *   conformity.
 * - TestValidator.equals / predicate are used only for business-level checks:
 *
 *   - The cart toggles `is_active` from true (or undefined treated as active) to
 *       false after update.
 *   - The order’s `origin_customer_cart_id` (when non-undefined) matches the cart
 *       id used for creation and later deletion.
 */
export async function test_api_customer_cart_delete_inactive_or_converted_cart(
  connection: api.IConnection,
) {
  // 1. Customer self-registration (join) and implicit authentication
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedCustomer);

  // 2. Create a new persistent cart for this customer
  const createCartBody = {
    // Let backend infer sensible defaults for currency and region when omitted
    is_active: true,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const createdCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: createCartBody,
      },
    );
  typia.assert(createdCart);

  // Basic sanity assertions on created cart
  TestValidator.predicate(
    "created cart id must be a non-empty UUID string",
    ((): boolean => createdCart.id.length > 0)(),
  );

  // 3. Mark the cart as inactive via update
  const updateCartBody = {
    is_active: false,
  } satisfies IShoppingMallCustomerCart.IUpdate;

  const updatedCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.update(
      connection,
      {
        customerCartId: createdCart.id,
        body: updateCartBody,
      },
    );
  typia.assert(updatedCart);

  TestValidator.equals(
    "updated cart id should stay the same as created cart id",
    updatedCart.id,
    createdCart.id,
  );

  TestValidator.equals(
    "updated cart must be inactive after toggle",
    updatedCart.is_active,
    false,
  );

  // 4. Create an order from this (now inactive) cart
  // Use the cart's monetary snapshot as the basis for the order totals
  const orderCreateBody = {
    customer_cart_id: updatedCart.id,
    currency_code: updatedCart.currency_code,
    items_subtotal_amount: updatedCart.subtotal_amount,
    discount_total_amount: updatedCart.discount_amount,
    shipping_total_amount: updatedCart.shipping_amount,
    tax_total_amount: updatedCart.tax_amount,
    grand_total_amount: updatedCart.total_amount,
    shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
    billing_address_id: typia.random<string & tags.Format<"uuid">>(),
    customer_note: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallOrder.ICreate;

  const createdOrder: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(createdOrder);

  TestValidator.equals(
    "order currency must match cart currency",
    createdOrder.currency_code,
    updatedCart.currency_code,
  );

  TestValidator.equals(
    "order grand total must match cart total_amount snapshot",
    createdOrder.grand_total_amount,
    updatedCart.total_amount,
  );

  // 5. Delete the inactive/converted cart
  await api.functional.shoppingMall.customer.customerCarts.erase(connection, {
    customerCartId: createdCart.id,
  });

  // 6. Validate that the order still logically references the original cart
  if (createdOrder.origin_customer_cart_id !== undefined) {
    TestValidator.equals(
      "order origin_customer_cart_id (when set) should equal deleted cart id",
      createdOrder.origin_customer_cart_id,
      createdCart.id,
    );
  }
}
