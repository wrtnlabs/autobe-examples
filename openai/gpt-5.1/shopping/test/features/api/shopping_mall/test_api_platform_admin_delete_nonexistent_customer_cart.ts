import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";

/**
 * Validate platform admin deletion behavior on non-existent customer carts.
 *
 * Business goal: Ensure that when a platform administrator attempts to delete a
 * customer cart using an ID that does not correspond to any existing cart, the
 * API responds with an error (via thrown HttpError) and does not affect any
 * existing customer carts.
 *
 * High-level flow:
 *
 * 1. Register a platform admin (join) to obtain an authorized admin session.
 * 2. Register a customer and create a real customer cart as control data.
 * 3. Build a clearly non-existent customerCartId (UUID string distinct from the
 *    real cart id).
 * 4. Switch to platform admin and invoke DELETE
 *    /shoppingMall/platformAdmin/customerCarts/{customerCartId} with the
 *    non-existent id, asserting that it throws an error.
 * 5. Switch back to the customer and create another cart successfully to
 *    demonstrate that existing customer carts and cart-creation behavior are
 *    unaffected by the failed delete attempt.
 *
 * Note: No admin-side cart listing or detail API is available in the SDK, so we
 * validate non-impact indirectly by ensuring the customer can still create
 * additional carts after the failed deletion attempt.
 */
export async function test_api_platform_admin_delete_nonexistent_customer_cart(
  connection: api.IConnection,
) {
  // Helper to make a random HTTP URL suitable for href/referrer
  const randomUrl = (): string =>
    `https://example.com/${RandomGenerator.alphaNumeric(8)}`;

  // -----------------------------
  // 1. Register a platform admin
  // -----------------------------
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: adminPassword,
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuth: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // ----------------------------------
  // 2. Register a customer and a cart
  // ----------------------------------
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword = RandomGenerator.alphaNumeric(12);

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    name: RandomGenerator.name(),
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  const firstCartCreateBody = {
    currency_code: "USD",
    region_code: "US-East",
    channel: "web",
    metadata: {
      campaign: "e2e-nonexistent-delete",
    },
    is_active: true,
    source_guest_token: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallCustomerCart.ICreate;

  const firstCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      { body: firstCartCreateBody },
    );
  typia.assert(firstCart);

  const existingCartId: string & tags.Format<"uuid"> = firstCart.id;

  // -------------------------------------------------
  // 3. Build a clearly non-existent customerCartId
  // -------------------------------------------------
  let nonExistentCartId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (nonExistentCartId === existingCartId) {
    // Extremely unlikely, but regenerate once for safety
    nonExistentCartId = typia.random<string & tags.Format<"uuid">>();
  }

  TestValidator.notEquals(
    "non-existent cart id must differ from an existing cart id",
    nonExistentCartId,
    existingCartId,
  );

  // -----------------------------------------
  // 4. Switch back to platform admin session
  // -----------------------------------------
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminReAuth: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminReAuth);

  // ----------------------------------------------------------------
  // 5. Attempt to delete a non-existent cart as platform admin
  // ----------------------------------------------------------------
  await TestValidator.error(
    "deleting non-existent customer cart should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.customerCarts.erase(
        connection,
        {
          customerCartId: nonExistentCartId,
        },
      );
    },
  );

  // -------------------------------------------------------------
  // 6. Ensure cart functionality still works for the customer
  // -------------------------------------------------------------

  // Switch back to the same customer via login
  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: randomUrl(),
    referrer: randomUrl(),
    userAgent: undefined,
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerReAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerReAuth);

  // Create another cart after the failed delete to prove no global side effect
  const secondCartCreateBody = {
    currency_code: "USD",
    region_code: "US-East",
    channel: "web",
    metadata: {
      campaign: "e2e-nonexistent-delete-2",
    },
    is_active: true,
    source_guest_token: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallCustomerCart.ICreate;

  const secondCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      { body: secondCartCreateBody },
    );
  typia.assert(secondCart);

  TestValidator.notEquals(
    "newly created cart id must differ from the original cart id",
    secondCart.id,
    existingCartId,
  );
}
