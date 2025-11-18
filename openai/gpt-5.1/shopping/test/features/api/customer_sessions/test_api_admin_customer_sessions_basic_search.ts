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
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";

/**
 * Basic admin search over a single customer's sessions with pagination.
 *
 * Business goal
 *
 * - Ensure that an authenticated admin can call the customer-session search
 *   endpoint and receive a paginated list of sessions for a specific customer.
 * - Validate that basic pagination parameters (page, limit) are echoed correctly
 *   in the response pagination block.
 * - Validate that all returned sessions belong to the target customer.
 *
 * High level steps
 *
 * 1. Create an admin account using POST /auth/admin/join.
 *
 *    - This will also authenticate the admin and attach an access token to the
 *         shared connection.
 * 2. Create a customer account using POST /auth/customer/join.
 *
 *    - This operation both creates the customer and establishes at least one session
 *         row in shopping_mall_customer_sessions.
 *    - Capture the created customer.id for later use.
 * 3. Re-establish admin authentication by calling POST /auth/admin/join again with
 *    a different admin email so that the connection is in an
 *    admin-authenticated state when hitting the admin-only endpoint.
 * 4. Call PATCH /shoppingMall/admin/customers/{customerId}/sessions with:
 *
 *    - Path parameter customerId = the previously created customer.id
 *    - Body of type IShoppingMallCustomerSession.IRequest with: page = 1 limit =
 *         some small positive integer (e.g., 10) all other filters omitted
 *         (left undefined)
 * 5. Validate the response:
 *
 *    - Typia.assert on the returned page object
 *    - Assert that pagination.current === 1 and pagination.limit === 10
 *    - Assert that pagination.records and pagination.pages are non-negative
 *    - Assert that for every element in data, session.customer.id equals the created
 *         customer.id.
 *
 * Notes
 *
 * - We rely on join endpoints to create sessions; no explicit login API is
 *   provided in the current SDK.
 * - We never touch connection.headers directly; authentication tokens are managed
 *   by the SDK join calls.
 */
export async function test_api_admin_customer_sessions_basic_search(
  connection: api.IConnection,
) {
  // 1. Admin joins (admin #1) - mainly to exercise dependency; we don't
  //    strictly need this admin to call the session listing later, but
  //    it validates that admin join works.
  const adminJoinBody1 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;
  const admin1 = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody1,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin1);

  // 2. Customer joins; this also creates a session for the customer and
  //    switches the connection to be authenticated as that customer.
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;
  const customer = await api.functional.auth.customer.join(connection, {
    body: customerJoinBody,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customer);

  // 3. Re-join as admin (admin #2) so that the connection is using an
  //    admin token when calling the admin sessions endpoint.
  const adminJoinBody2 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;
  const admin2 = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody2,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin2);

  // 4. Perform basic session search for the created customer with simple
  //    pagination (page=1, limit=10) and no additional filters.
  const requestPage = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const requestLimit = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const requestBody = {
    page: requestPage,
    limit: requestLimit,
  } satisfies IShoppingMallCustomerSession.IRequest;

  const page = await api.functional.shoppingMall.admin.customers.sessions.index(
    connection,
    {
      customerId: customer.id,
      body: requestBody,
    },
  );
  typia.assert<IPageIShoppingMallCustomerSession.ISummary>(page);

  // 5. Assertions on pagination metadata.
  TestValidator.equals(
    "pagination.current should echo requested page",
    page.pagination.current,
    requestPage,
  );
  TestValidator.equals(
    "pagination.limit should echo requested limit",
    page.pagination.limit,
    requestLimit,
  );
  TestValidator.predicate(
    "pagination.records should be non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages should be non-negative",
    page.pagination.pages >= 0,
  );

  // 6. Verify that all returned sessions belong to the created customer.
  for (const session of page.data) {
    typia.assert<IShoppingMallCustomerSession.ISummary>(session);
    TestValidator.equals(
      "session.customer.id must match target customerId",
      session.customer.id,
      customer.id,
    );
  }
}
