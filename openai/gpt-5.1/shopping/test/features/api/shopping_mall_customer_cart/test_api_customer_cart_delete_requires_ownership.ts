import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";

/**
 * Verify that a customer cannot delete another customer's cart.
 *
 * Business goal
 *
 * - Ensure that DELETE /shoppingMall/customer/customerCarts/{customerCartId} is
 *   protected by strict ownership checks: only the owning customer can delete
 *   their own cart.
 * - A different authenticated customer must not be able to delete someone else's
 *   cart, even if they somehow know the cart id.
 *
 * Limitations and design choices
 *
 * - The exposed API set only includes:
 *
 *   - POST /auth/customer/join -> api.functional.auth.customer.join
 *   - POST /shoppingMall/customer/customerCarts ->
 *       api.functional.shoppingMall.customer.customerCarts.create
 *   - DELETE /shoppingMall/customer/customerCarts/{customerCartId} ->
 *       api.functional.shoppingMall.customer.customerCarts.erase
 * - There is no "get cart" or "list carts" endpoint allowed for this test, so we
 *   cannot re-fetch a cart after an operation. Therefore, we validate ownership
 *   behavior indirectly by contrasting success and failure cases of erase()
 *   under different authenticated users.
 * - Type and structure validation is handled by typia.assert; we do not perform
 *   manual field existence or format checks.
 * - We do not assert a specific HTTP status code; we only assert that an error
 *   occurs for unauthorized deletion using TestValidator.error(), in line with
 *   the global rules.
 *
 * High-level scenario
 *
 * 1. Register Customer A (owner of the cart):
 *
 *    - Call api.functional.auth.customer.join with a random
 *         IShoppingMallCustomerAuth.IJoin body.
 *    - Confirm that an IShoppingMallCustomer.IAuthorized payload is returned and
 *         validated via typia.assert.
 *    - Capture Customer A's id for later ownership checks.
 * 2. While authenticated as Customer A, create a cart:
 *
 *    - Call api.functional.shoppingMall.customer.customerCarts.create with a valid
 *         IShoppingMallCustomerCart.ICreate body, e.g. using explicit values
 *         instead of raw typia.random so that we can write clear expectations.
 *    - Validate the returned IShoppingMallCustomerCart via typia.assert.
 *    - Assert that cart.customer.id === customerA.id to confirm ownership binding at
 *         creation time.
 *    - Store cart.id as ownerCartId.
 * 3. Register Customer B (non-owner attacker):
 *
 *    - Call api.functional.auth.customer.join again with a different email.
 *    - This call overwrites connection.headers.Authorization to Customer B's token;
 *         subsequent customer endpoints run as Customer B.
 *    - Validate the returned IShoppingMallCustomer.IAuthorized via typia.assert and
 *         store customerB.id.
 * 4. As Customer B, attempt to delete Customer A's cart:
 *
 *    - Call api.functional.shoppingMall.customer.customerCarts.erase with
 *         customerCartId: ownerCartId inside TestValidator.error, because
 *         erase() is asynchronous.
 *    - We expect an error (authorization or not-found semantics) due to ownership
 *         violation. We do not assert the status code.
 * 5. Demonstrate that the owner can delete their own cart:
 *
 *    - Re-register Customer A with a new account (Customer A2) using
 *         api.functional.auth.customer.join. This gives us a fresh auth context
 *         that clearly belongs to a new customer id (customerA2.id).
 *    - As Customer A2, create another cart via create().
 *    - Validate the new cart and assert that cart.customer.id === customerA2.id.
 *    - Call erase() as Customer A2 for this new cart id and expect success (no
 *         error). Because erase() returns void, we only rely on the absence of
 *         an exception.
 * 6. Optional extra contrast (within the limits of available APIs):
 *
 *    - After deleting Customer A2's cart, attempt to delete the same cart id again
 *         and assert that it fails with an error using TestValidator.error.
 *         This indirectly supports that deletion is actually taking effect when
 *         performed by the rightful owner.
 *
 * Assertions
 *
 * - Typia.assert on all join() and create() responses.
 * - TestValidator.equals to verify that cart.customer.id matches the authorized
 *   customer's id for both Customer A and Customer A2.
 * - Await TestValidator.error for the unauthorized deletion attempt by Customer B
 *   (and the optional second deletion attempt by Customer A2).
 * - Successful erase() calls for owner deletions must not throw.
 */
export async function test_api_customer_cart_delete_requires_ownership(
  connection: api.IConnection,
) {
  // 1. Register Customer A (cart owner)
  const joinBodyA = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    // ip is optional; use null explicitly to exercise nullable handling
    ip: null,
    href: `https://shop.example.com/signup/${RandomGenerator.alphaNumeric(6)}`,
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerA: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBodyA,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerA);

  // 2. Create a cart as Customer A (owner)
  const createCartBodyA = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: {
      scenario: "ownership-test-A",
    },
    is_active: true,
    source_guest_token: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallCustomerCart.ICreate;

  const ownerCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: createCartBodyA,
      },
    );
  typia.assert<IShoppingMallCustomerCart>(ownerCart);

  // Verify that the created cart is owned by Customer A
  TestValidator.equals(
    "cart created by Customer A must be owned by Customer A",
    ownerCart.customer.id,
    customerA.id,
  );

  const ownerCartId: string = ownerCart.id;

  // 3. Register Customer B (non-owner attacker)
  const joinBodyB = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    ip: null,
    href: `https://shop.example.com/signup/${RandomGenerator.alphaNumeric(6)}`,
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerB: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBodyB,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerB);

  // Sanity check: Customer B id must differ from Customer A id
  TestValidator.notEquals(
    "Customer B must be a different principal than Customer A",
    customerB.id,
    customerA.id,
  );

  // 4. As Customer B, attempt to delete Customer A's cart
  await TestValidator.error(
    "Customer B must not be able to delete Customer A's cart",
    async () => {
      await api.functional.shoppingMall.customer.customerCarts.erase(
        connection,
        {
          customerCartId: ownerCartId,
        },
      );
    },
  );

  // 5. Demonstrate that the rightful owner can delete their own cart
  //    by creating a fresh owner (Customer A2) and deleting their cart.

  const joinBodyA2 = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    ip: null,
    href: `https://shop.example.com/signup/${RandomGenerator.alphaNumeric(6)}`,
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerA2: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBodyA2,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerA2);

  const createCartBodyA2 = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: {
      scenario: "ownership-test-A2",
    },
    is_active: true,
    source_guest_token: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallCustomerCart.ICreate;

  const ownerCart2: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: createCartBodyA2,
      },
    );
  typia.assert<IShoppingMallCustomerCart>(ownerCart2);

  TestValidator.equals(
    "second cart must be owned by Customer A2",
    ownerCart2.customer.id,
    customerA2.id,
  );

  const ownerCartId2: string = ownerCart2.id;

  // Owner (Customer A2) deletes their own cart successfully
  await api.functional.shoppingMall.customer.customerCarts.erase(connection, {
    customerCartId: ownerCartId2,
  });

  // 6. Optional: verify that repeated deletion fails, reinforcing that
  //    a successful owner deletion actually removes or protects the cart.
  await TestValidator.error(
    "Deleting an already-deleted cart must fail",
    async () => {
      await api.functional.shoppingMall.customer.customerCarts.erase(
        connection,
        {
          customerCartId: ownerCartId2,
        },
      );
    },
  );
}
