import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";

/**
 * Verify that an existing customer can log in successfully with valid
 * credentials, receives a fresh authorization token, and that a corresponding
 * customer session is observable from the admin-facing session listing API.
 *
 * Business flow:
 *
 * 1. A new customer joins the shopping mall using POST /auth/customer/join.
 * 2. Later, in a new (unauthenticated) client context, the same customer logs in
 *    using POST /auth/customer/login with correct email and password plus
 *    realistic session metadata (href, referrer, optional ip).
 * 3. The login response must return IShoppingMallCustomer.IAuthorized whose
 *    identity matches the joined customer and whose token fields represent a
 *    new issuance.
 * 4. Customer account timestamps (last_login_at, created_at, updated_at) must be
 *    consistent with the login event time.
 * 5. An administrator can query the customer sessions via PATCH
 *    /shoppingMall/admin/customers/{customerId}/sessions and should see at
 *    least one session corresponding to the login, including the recorded
 *    href/referrer.
 *
 * This test focuses on the happy path of successful credential-based login and
 * basic auditability; it intentionally avoids any type-error or invalid DTO
 * scenarios.
 */
export async function test_api_customer_login_success_with_valid_credentials(
  connection: api.IConnection,
) {
  // 1. Customer joins with known credentials
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const joinHref: string & tags.Format<"uri"> =
    "https://shop.example.com/signup" as string & tags.Format<"uri">;
  const joinReferrer: string & tags.Format<"uri"> =
    "https://landing.example.com/campaign" as string & tags.Format<"uri">;

  const joinBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: joinHref,
    referrer: joinReferrer,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const joined: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // 2. Prepare a fresh, unauthenticated connection to simulate a new client
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Perform login with the same credentials but new session metadata
  const loginHref: string & tags.Format<"uri"> =
    "https://shop.example.com/login" as string & tags.Format<"uri">;
  const loginReferrer: string & tags.Format<"uri"> =
    "https://ads.example.com/banner" as string & tags.Format<"uri">;

  const loginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: "127.0.0.1",
    href: loginHref,
    referrer: loginReferrer,
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const loginStartAt: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;

  const loggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(unauthenticatedConnection, {
      body: loginBody,
    });
  typia.assert(loggedIn);

  // 4. Identity consistency checks
  TestValidator.equals(
    "customer id from login should match join",
    loggedIn.id,
    joined.id,
  );
  TestValidator.equals(
    "customer email from login should match join",
    loggedIn.email,
    joined.email,
  );

  // 5. Token rotation semantics: new access/refresh tokens that differ from join
  TestValidator.predicate(
    "login access token should be non-empty",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "login refresh token should be non-empty",
    loggedIn.token.refresh.length > 0,
  );
  TestValidator.notEquals(
    "access token should rotate on login",
    loggedIn.token.access,
    joined.token.access,
  );
  TestValidator.notEquals(
    "refresh token should rotate on login",
    loggedIn.token.refresh,
    joined.token.refresh,
  );

  // 6. Timestamp behavior: last_login_at and updated_at vs login start time
  const loginStartDate: Date = new Date(loginStartAt);

  if (loggedIn.last_login_at !== null && loggedIn.last_login_at !== undefined) {
    const lastLoginDate: Date = new Date(loggedIn.last_login_at);
    TestValidator.predicate(
      "last_login_at must be at or after login start time",
      lastLoginDate.getTime() >= loginStartDate.getTime(),
    );
  }

  const createdAtDate: Date = new Date(loggedIn.created_at);
  const updatedAtDate: Date = new Date(loggedIn.updated_at);

  TestValidator.predicate(
    "updated_at must be at or after created_at",
    updatedAtDate.getTime() >= createdAtDate.getTime(),
  );
  TestValidator.predicate(
    "updated_at must be at or after login start time",
    updatedAtDate.getTime() >= loginStartDate.getTime(),
  );

  // 7. Create an admin account and authenticate as admin
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://shop.example.com/admin/join" as string & tags.Format<"uri">,
    referrer: "https://internal.example.com/admin-console" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 8. As admin, query customer sessions for the logged-in customer
  const sessionsPage: IPageIShoppingMallCustomerSession.ISummary =
    await api.functional.shoppingMall.admin.customers.sessions.index(
      connection,
      {
        customerId: loggedIn.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
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
  typia.assert(sessionsPage);

  // Ensure at least one session exists for this customer
  TestValidator.predicate(
    "at least one session should exist for the customer",
    sessionsPage.data.length > 0,
  );

  // Prefer sessions matching the login href/referrer
  const matchingSessions: IShoppingMallCustomerSession.ISummary[] =
    sessionsPage.data.filter((session) => {
      return (
        session.href === loginHref &&
        session.referrer === loginReferrer &&
        session.customer.id === loggedIn.id
      );
    });

  TestValidator.predicate(
    "at least one session should match the login href and referrer",
    matchingSessions.length > 0,
  );
}
