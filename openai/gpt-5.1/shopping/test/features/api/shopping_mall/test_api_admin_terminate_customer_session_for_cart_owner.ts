import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
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
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";

/**
 * Admin terminates an active customer session that owns a cart.
 *
 * Business purpose:
 *
 * - Ensure that an administrator can locate a concrete customer who is actively
 *   shopping (has a cart created under an authenticated session), inspect that
 *   customer’s sessions, and force-terminate one of them via the dedicated
 *   admin session termination endpoint.
 * - Verify that this operation is successful and that the session listing
 *   reflects termination (either by removal of that session from the active
 *   list or by marking it as expired), while the cart created under that
 *   session remains intact at least at the time of creation.
 *
 * High-level test steps:
 *
 * 1. Join as an admin (POST /auth/admin/join) to establish an admin identity and
 *    initial authenticated context.
 * 2. Join as a customer (POST /auth/customer/join) to establish a customer
 *    identity and authenticated customer session.
 * 3. As the customer, create a cart header (POST /shoppingMall/customer/carts) to
 *    simulate an active shopping session; assert that the cart is
 *    customer-owned and structurally valid.
 * 4. Log back in as the admin (POST /auth/admin/login) to restore the admin
 *    authorization context in the shared connection.
 * 5. As admin, search customers (PATCH /shoppingMall/admin/customers) using the
 *    known customer email and extract the customerId.
 * 6. As admin, list that customer’s sessions (PATCH
 *    /shoppingMall/admin/customers/{customerId}/sessions), select one sessionId
 *    that belongs to the target customer.
 * 7. Call DELETE /shoppingMall/admin/customers/{customerId}/sessions/{sessionId}
 *    to forcibly terminate that session.
 * 8. Re-list the customer’s sessions and validate that the terminated session
 *    either no longer appears in the listing or appears with a non-null
 *    expired_at, indicating termination.
 */
export async function test_api_admin_terminate_customer_session_for_cart_owner(
  connection: api.IConnection,
) {
  // 1. Join as an admin to create an administrator identity and obtain tokens.
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const adminJoinOutput: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdminJoin.ICreate,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminJoinOutput);

  // 2. Join as a customer to establish a customer account and authenticated session.
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const customerJoinOutput: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallCustomerJoin.IRequest,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerJoinOutput);

  // 3. As the authenticated customer, create a cart to simulate active shopping.
  const cartCreateBody = {
    actor_type: "customer",
    status: undefined,
    currency_code: undefined,
  } satisfies IShoppingMallCart.ICreate;
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: cartCreateBody,
    });
  typia.assert<IShoppingMallCart>(cart);

  // Basic business assertions on the created cart shape.
  TestValidator.predicate(
    "cart id must be a non-empty string",
    typeof cart.id === "string" && cart.id.length > 0,
  );
  TestValidator.predicate(
    "cart actor_type should be customer for a customer-owned cart",
    cart.actor_type === "customer",
  );
  TestValidator.predicate(
    "cart status should be a non-empty string",
    typeof cart.status === "string" && cart.status.length > 0,
  );

  // 4. Log back in as the admin to regain admin authorization context.
  const adminLoginOutput: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdminLogin.ICreate,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoginOutput);

  // 5. As admin, search for the specific customer via email.
  const customersPage: IPageIShoppingMallCustomer.ISummary =
    await api.functional.shoppingMall.admin.customers.index(connection, {
      body: {
        page: 1,
        limit: 10,
        search: undefined,
        status: undefined,
        email: customerEmail,
        created_from: undefined,
        created_until: undefined,
      } satisfies IShoppingMallCustomer.IRequest,
    });
  typia.assert<IPageIShoppingMallCustomer.ISummary>(customersPage);

  const matchedCustomers = customersPage.data.filter(
    (c) => c.email === customerEmail,
  );
  TestValidator.predicate(
    "admin customer search must return at least one customer with the target email",
    matchedCustomers.length >= 1,
  );

  const customerSummary: IShoppingMallCustomer.ISummary = matchedCustomers[0];
  const customerId: string & tags.Format<"uuid"> = customerSummary.id;

  // 6. As admin, list sessions for this customer.
  const sessionsPageBefore: IPageIShoppingMallCustomerSession.ISummary =
    await api.functional.shoppingMall.admin.customers.sessions.index(
      connection,
      {
        customerId,
        body: {
          page: 1,
          limit: 10,
          createdAtFrom: null,
          createdAtTo: null,
          lastSeenFrom: null,
          lastSeenTo: null,
          ipAddress: null,
          userAgent: null,
          channel: null,
          status: null,
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert<IPageIShoppingMallCustomerSession.ISummary>(sessionsPageBefore);

  TestValidator.predicate(
    "customer sessions list must contain at least one session before termination",
    sessionsPageBefore.data.length >= 1,
  );

  const sessionForCustomer = sessionsPageBefore.data.find(
    (s) => s.customer.id === customerId,
  );
  TestValidator.predicate(
    "at least one session must belong to the target customer",
    sessionForCustomer !== undefined,
  );
  if (!sessionForCustomer) return; // Guard for TypeScript, though predicate already asserts.

  const sessionId: string & tags.Format<"uuid"> = sessionForCustomer.id;

  // 7. As admin, terminate the selected session.
  await api.functional.shoppingMall.admin.customers.sessions.erase(connection, {
    customerId,
    sessionId,
  });

  // 8. Re-list sessions and validate that the terminated session is no longer active.
  const sessionsPageAfter: IPageIShoppingMallCustomerSession.ISummary =
    await api.functional.shoppingMall.admin.customers.sessions.index(
      connection,
      {
        customerId,
        body: {
          page: 1,
          limit: 10,
          createdAtFrom: null,
          createdAtTo: null,
          lastSeenFrom: null,
          lastSeenTo: null,
          ipAddress: null,
          userAgent: null,
          channel: null,
          status: null,
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert<IPageIShoppingMallCustomerSession.ISummary>(sessionsPageAfter);

  const afterSessionsForCustomer = sessionsPageAfter.data.filter(
    (s) => s.customer.id === customerId,
  );
  const stillExisting = afterSessionsForCustomer.find(
    (s) => s.id === sessionId,
  );

  // The session is considered terminated if it disappeared or has a non-null expired_at.
  const terminated =
    stillExisting === undefined ||
    (stillExisting.expired_at !== null &&
      stillExisting.expired_at !== undefined);

  TestValidator.predicate(
    "terminated session must either disappear from listing or be marked with non-null expired_at",
    terminated,
  );
}
