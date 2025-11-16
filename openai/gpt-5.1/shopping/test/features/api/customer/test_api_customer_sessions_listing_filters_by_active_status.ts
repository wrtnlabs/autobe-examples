import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";

/**
 * Validate that the customer session listing endpoint filters by active status
 * and respects customer isolation.
 *
 * ## Business goal
 *
 * Platform administrators need to inspect authentication sessions for a
 * specific customer and filter them by whether they are still active or already
 * expired. This test verifies that the PATCH
 * /shoppingMall/platformAdmin/customers/{customerId}/sessions endpoint
 * correctly interprets the `is_active` flag in
 * IShoppingMallCustomerSession.IRequest and that pagination metadata is
 * reasonable, using only the APIs available in the SDK.
 *
 * Due to the lack of explicit logout or expiry control APIs, the test does not
 * attempt to force creation of expired sessions. Instead, it focuses on:
 *
 * - Ensuring that `is_active: true` returns a consistent set of sessions and that
 *   repeated calls for a different customer do not mix session IDs.
 * - Calling `is_active: false` to confirm the endpoint behaves correctly even
 *   when there may be zero expired sessions, returning an empty or disjoint set
 *   of sessions without errors.
 *
 * ## Scenario steps
 *
 * 1. Register a platform admin using POST /auth/platformAdmin/join.
 *
 *    - Capture the resulting admin identity (IAuthorized) and rely on the SDK to
 *         attach the admin access token to the connection.
 * 2. Register two customers using POST /auth/customer/join.
 *
 *    - CustomerA: will be used to generate multiple sessions by logging in.
 *    - CustomerB: will be used to validate customer isolation in listings.
 * 3. For customerA, perform multiple login attempts via POST /auth/customer/login.
 *
 *    - Each login creates an additional session row in
 *         shopping_mall_customer_sessions.
 * 4. Switch back to platform admin context using POST /auth/platformAdmin/login.
 *
 *    - This ensures we have an admin JWT in the connection before calling the
 *         admin-only sessions listing endpoint.
 * 5. Call PATCH /shoppingMall/platformAdmin/customers/{customerId}/sessions for
 *    customerA with `is_active: true` and an explicit page/limit.
 *
 *    - Validate response with typia.assert.
 *    - Collect all returned session IDs (sessionIdsActiveA).
 *    - Assert that pagination.limit matches the request limit and that
 *         pagination.current is zero-based for the requested page.
 * 6. Call the same endpoint for customerA with `is_active: false`.
 *
 *    - Validate type with typia.assert.
 *    - Collect session IDs (sessionIdsExpiredA).
 *    - Assert that there is no overlap between sessionIdsActiveA and
 *         sessionIdsExpiredA. If the expired list is empty, assert that the
 *         data array length is zero and pagination.records is consistent with
 *         that.
 * 7. Call the same endpoint for customerB with `is_active: true`.
 *
 *    - Validate type with typia.assert.
 *    - Collect session IDs (sessionIdsActiveB).
 *    - Assert that there is no overlap between sessionIdsActiveA and
 *         sessionIdsActiveB, confirming that sessions are not mixed between
 *         customers.
 *
 * The test uses realistic random data generation for emails, names, and URLs,
 * and relies on the SDK’s automatic header management for authentication
 * tokens. It does not inspect HTTP status codes directly nor simulate type
 * errors.
 */
export async function test_api_customer_sessions_listing_filters_by_active_status(
  connection: api.IConnection,
) {
  // Helper to build a reasonable href/referrer pair
  const buildHref = () =>
    `https://customer.example.com/${RandomGenerator.alphabets(8)}` as string;

  // 1. Register a platform admin (auto-authenticates and sets token header)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    ip: null,
    href: `https://admin.example.com/${RandomGenerator.alphabets(8)}` as string &
      tags.Format<"uri">,
    referrer: `https://admin.example.com/login` as string & tags.Format<"uri">,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminJoin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  // 2. Register two customers
  const customerAEmail = typia.random<string & tags.Format<"email">>();
  const customerABody = {
    email: customerAEmail,
    password: RandomGenerator.alphabets(12),
    name: RandomGenerator.name(),
    ip: null,
    href: buildHref() as string & tags.Format<"uri">,
    referrer: buildHref() as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerABody,
    });
  typia.assert(customerAAuth);
  const customerAId = customerAAuth.id;

  const customerBEmail = typia.random<string & tags.Format<"email">>();
  const customerBBody = {
    email: customerBEmail,
    password: RandomGenerator.alphabets(12),
    name: RandomGenerator.name(),
    ip: null,
    href: buildHref() as string & tags.Format<"uri">,
    referrer: buildHref() as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerBAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBBody,
    });
  typia.assert(customerBAuth);
  const customerBId = customerBAuth.id;

  // 3. For customerA, perform multiple logins to create multiple sessions
  const doCustomerLogin = async (email: string) => {
    const loginBody = {
      email,
      password: customerABody.password,
      ip: null,
      href: buildHref() as string & tags.Format<"uri">,
      referrer: buildHref() as string & tags.Format<"uri">,
      userAgent: RandomGenerator.name(),
    } satisfies IShoppingMallCustomerAuth.ILogin;

    const auth: IShoppingMallCustomer.IAuthorized =
      await api.functional.auth.customer.login(connection, {
        body: loginBody,
      });
    typia.assert(auth);
    return auth;
  };

  // Create several sessions for customerA
  const loginCount = 3;
  for (let i = 0; i < loginCount; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await doCustomerLogin(customerAEmail);
  }

  // 4. Switch back to platform admin context using login
  const adminLoginBody = {
    email: adminJoin.email,
    password: adminJoinBody.password,
    ip: null,
    href: `https://admin.example.com/dashboard` as string & tags.Format<"uri">,
    referrer: `https://admin.example.com/login` as string & tags.Format<"uri">,
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // Common pagination settings: first page, small limit
  const requestedPage = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const requestedLimit = 10 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<200>;

  // 5. List active sessions for customerA
  const activeRequestA = {
    page: requestedPage,
    limit: requestedLimit,
    is_active: true,
  } satisfies IShoppingMallCustomerSession.IRequest;

  const activePageA: IPageIShoppingMallCustomerSession.ISummary =
    await api.functional.shoppingMall.platformAdmin.customers.sessions.index(
      connection,
      {
        customerId: customerAId,
        body: activeRequestA,
      },
    );
  typia.assert(activePageA);

  const activeSessionIdsA = activePageA.data.map((s) => s.id);

  // Assert pagination.limit matches request limit when there are records,
  // and current is zero-based.
  TestValidator.equals(
    "pagination.limit for active sessions of customerA",
    activePageA.pagination.limit,
    requestedLimit,
  );
  TestValidator.equals(
    "pagination.current for active sessions of customerA",
    activePageA.pagination.current,
    (requestedPage - 1) as number,
  );

  // 6. List expired sessions for customerA
  const expiredRequestA = {
    page: requestedPage,
    limit: requestedLimit,
    is_active: false,
  } satisfies IShoppingMallCustomerSession.IRequest;

  const expiredPageA: IPageIShoppingMallCustomerSession.ISummary =
    await api.functional.shoppingMall.platformAdmin.customers.sessions.index(
      connection,
      {
        customerId: customerAId,
        body: expiredRequestA,
      },
    );
  typia.assert(expiredPageA);

  const expiredSessionIdsA = expiredPageA.data.map((s) => s.id);

  // Ensure no overlap between active and expired session IDs for customerA.
  const overlappingIdsA = activeSessionIdsA.filter((id) =>
    expiredSessionIdsA.includes(id),
  );
  TestValidator.equals(
    "no overlapping session IDs between active and expired for customerA",
    overlappingIdsA.length,
    0,
  );

  // If there are no expired sessions, ensure pagination.records is zero.
  if (expiredSessionIdsA.length === 0) {
    TestValidator.equals(
      "when no expired sessions, records should be zero",
      expiredPageA.pagination.records,
      0,
    );
  }

  // 7. List active sessions for customerB and ensure isolation
  const activeRequestB = {
    page: requestedPage,
    limit: requestedLimit,
    is_active: true,
  } satisfies IShoppingMallCustomerSession.IRequest;

  const activePageB: IPageIShoppingMallCustomerSession.ISummary =
    await api.functional.shoppingMall.platformAdmin.customers.sessions.index(
      connection,
      {
        customerId: customerBId,
        body: activeRequestB,
      },
    );
  typia.assert(activePageB);

  const activeSessionIdsB = activePageB.data.map((s) => s.id);

  const overlappingIdsBetweenCustomers = activeSessionIdsA.filter((id) =>
    activeSessionIdsB.includes(id),
  );
  TestValidator.equals(
    "active session IDs should not be shared between customerA and customerB",
    overlappingIdsBetweenCustomers.length,
    0,
  );
}
