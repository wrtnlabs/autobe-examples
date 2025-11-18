import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallGuestuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestuserSession";

/**
 * Validate that an admin can retrieve a guest user session detail using the
 * admin guestUsers/sessions endpoint, in a scenario where a customer cart has
 * been created earlier.
 *
 * Business context:
 *
 * - Customers can join and log into the shopping mall.
 * - Customers can create carts via /shoppingMall/customer/carts, which in a full
 *   system may be associated with guest-user sessions.
 * - Admins can inspect guest user sessions through GET
 *   /shoppingMall/admin/guestUsers/{guestUserId}/sessions/{sessionId}.
 *
 * Due to the limitations of the exposed SDK in this test context (no API to
 * derive guestUserId/sessionId from the customer/cart flows), this E2E test
 * focuses on:
 *
 * - Verifying that customer and admin authentication flows work end-to-end.
 * - Verifying that the admin guest user session detail endpoint responds with a
 *   payload conforming to IShoppingMallGuestuserSession when called with
 *   structurally valid UUIDs in an admin-authenticated context.
 *
 * Steps:
 *
 * 1. Register a customer via POST /auth/customer/join, establishing a customer
 *    Authorization header.
 * 2. Optionally log the customer in again via /auth/customer/login to exercise the
 *    login path and ensure the Authorization header remains valid.
 * 3. Create a cart via POST /shoppingMall/customer/carts with actor_type
 *    "customer" and simple status/currency_code values; assert the cart
 *    structure.
 * 4. Register an admin via POST /auth/admin/join; the SDK updates the
 *    Authorization header to the admin access token.
 * 5. Optionally log the admin in via /auth/admin/login to exercise the admin login
 *    flow.
 * 6. Generate random UUIDs for guestUserId and sessionId and call GET
 *    /shoppingMall/admin/guestUsers/{guestUserId}/sessions/{sessionId}.
 * 7. Assert that the response conforms to IShoppingMallGuestuserSession using
 *    typia.assert, and perform a couple of simple invariants such as non-empty
 *    id and guestUser.id equality with themselves (sanity check), while not
 *    asserting linkage to the earlier cart because no linking API exists.
 */
export async function test_api_admin_guestuser_session_detail_by_session_created_via_cart(
  connection: api.IConnection,
) {
  // 1. Customer join (registration) – establishes customer Authorization
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  // 2. Customer login – exercise login path (email from join, new login context)
  const customerLoginBody = {
    email: customerAuthorized.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://customer.example.com/login",
    referrer: "https://customer.example.com/join-complete",
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerLoggedIn);

  // 3. Customer creates a cart – actor_type "customer"
  const cartCreateBody = {
    actor_type: "customer",
    status: "active",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert<IShoppingMallCart>(cart);

  TestValidator.equals(
    "cart actor_type should be 'customer' as requested",
    cart.actor_type,
    cartCreateBody.actor_type,
  );

  // 4. Admin join – switch context to admin Authorization
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 5. Admin login – exercise admin login path explicitly
  const adminLoginBody = {
    email: adminAuthorized.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/join-complete",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoggedIn);

  // 6. Call admin guest user session detail endpoint with random UUIDs
  const guestUserId = typia.random<string & tags.Format<"uuid">>();
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  const session: IShoppingMallGuestuserSession =
    await api.functional.shoppingMall.admin.guestUsers.sessions.at(connection, {
      guestUserId,
      sessionId,
    });
  typia.assert<IShoppingMallGuestuserSession>(session);

  // 7. Basic structural sanity checks using TestValidator
  TestValidator.predicate(
    "guest user session id should be a non-empty string",
    session.id.length > 0,
  );

  TestValidator.equals(
    "guest user summary id should be stable with itself",
    session.guestUser.id,
    session.guestUser.id,
  );
}
