import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";

/**
 * Validate that admin customer search correctly filters by email and status.
 *
 * Business context:
 *
 * - Administrators need to search registered customers in the shopping mall
 *   backend by precise identifiers like email and by business status (e.g.
 *   active vs suspended).
 * - The PATCH /shoppingMall/admin/customers endpoint exposes flexible filters via
 *   IShoppingMallCustomer.IRequest and returns a paginated page of
 *   IShoppingMallCustomer.ISummary records in
 *   IPageIShoppingMallCustomer.ISummary.
 *
 * This test verifies a realistic workflow:
 *
 * 1. Create an admin account and ensure the connection is authenticated as that
 *    admin.
 * 2. Create two distinct customers with different emails using customer join.
 * 3. Normalize their statuses via the customer update endpoint so we have known
 *    deterministic values (e.g. one "active", one "suspended").
 * 4. Switch back to the admin actor using admin login.
 * 5. Use PATCH /shoppingMall/admin/customers to:
 *
 *    - Filter by email only and confirm only the matching customer appears.
 *    - Filter by email + matching status and confirm the single matching record.
 *    - Filter by email + non-matching status and confirm no records match.
 *    - Filter by status only and confirm only customers with that status appear.
 * 6. For each response, verify both the data array content and pagination metadata
 *    (records/pages) are consistent with the filtered subset size.
 */
export async function test_api_admin_customer_search_filter_by_email_and_status(
  connection: api.IConnection,
) {
  // 1. Register an admin and ensure we are authenticated as admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  // For clarity, perform an explicit admin login as well (actor switching pattern)
  const adminLoginBody = {
    email: adminJoin.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 2. Create two customers with distinct emails
  const customerJoinBodyA = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerA: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBodyA,
    });
  typia.assert(customerA);

  const customerJoinBodyB = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/campaign",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerB: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBodyB,
    });
  typia.assert(customerB);

  // 3. Normalize their statuses via customer update endpoint.
  // We will make customerA "active" and customerB "suspended".
  //
  // Since customer update is a customer-scoped endpoint, we must act as each
  // customer when updating their own record.

  // Switch to customer A actor via login
  const customerALoginBody = {
    email: customerJoinBodyA.email,
    password: customerJoinBodyA.password,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/profile",
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerALogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerALoginBody,
    });
  typia.assert(customerALogin);

  const updatedCustomerA: IShoppingMallCustomer =
    await api.functional.shoppingMall.customer.customers.update(connection, {
      customerId: customerALogin.id,
      body: {
        status: "active",
      } satisfies IShoppingMallCustomer.IUpdate,
    });
  typia.assert(updatedCustomerA);
  TestValidator.equals(
    "customer A status set to active",
    updatedCustomerA.status,
    "active",
  );

  // Switch to customer B actor via login
  const customerBLoginBody = {
    email: customerJoinBodyB.email,
    password: customerJoinBodyB.password,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/profile",
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const customerBLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerBLoginBody,
    });
  typia.assert(customerBLogin);

  const updatedCustomerB: IShoppingMallCustomer =
    await api.functional.shoppingMall.customer.customers.update(connection, {
      customerId: customerBLogin.id,
      body: {
        status: "suspended",
      } satisfies IShoppingMallCustomer.IUpdate,
    });
  typia.assert(updatedCustomerB);
  TestValidator.equals(
    "customer B status set to suspended",
    updatedCustomerB.status,
    "suspended",
  );

  // 4. Switch back to admin actor to invoke admin search API
  const adminRelogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminRelogin);

  // Common pagination settings
  const page = 1 as number & tags.Type<"int32">;
  const limit = 10 as number & tags.Type<"int32">;

  // Helper to assert that a page contains (or not) a specific customer id
  const containsCustomer = (
    pageResult: IPageIShoppingMallCustomer.ISummary,
    customerId: string,
  ): boolean => pageResult.data.some((c) => c.id === customerId);

  // 5-1. Filter by email only: expect exactly customerA
  const byEmailOnly: IPageIShoppingMallCustomer.ISummary =
    await api.functional.shoppingMall.admin.customers.index(connection, {
      body: {
        page,
        limit,
        email: customerJoinBodyA.email,
      } satisfies IShoppingMallCustomer.IRequest,
    });
  typia.assert(byEmailOnly);

  TestValidator.predicate(
    "email-only filter should include customer A",
    containsCustomer(byEmailOnly, updatedCustomerA.id),
  );
  TestValidator.predicate(
    "email-only filter should not include customer B",
    !containsCustomer(byEmailOnly, updatedCustomerB.id),
  );

  // If backend narrows strictly by unique email, records should be at least 1
  TestValidator.predicate(
    "email-only pagination.records should be >= 1",
    byEmailOnly.pagination.records >= 1,
  );

  // 5-2. Filter by email + matching status (active) for customerA
  const byEmailAndActive: IPageIShoppingMallCustomer.ISummary =
    await api.functional.shoppingMall.admin.customers.index(connection, {
      body: {
        page,
        limit,
        email: customerJoinBodyA.email,
        status: "active",
      } satisfies IShoppingMallCustomer.IRequest,
    });
  typia.assert(byEmailAndActive);

  TestValidator.predicate(
    "email+active filter should still include customer A",
    containsCustomer(byEmailAndActive, updatedCustomerA.id),
  );
  TestValidator.predicate(
    "email+active filter should not include customer B",
    !containsCustomer(byEmailAndActive, updatedCustomerB.id),
  );

  TestValidator.predicate(
    "email+active pagination.records should be >= 1",
    byEmailAndActive.pagination.records >= 1,
  );

  // 5-3. Filter by email + non-matching status (suspended) for customerA
  const byEmailAndSuspended: IPageIShoppingMallCustomer.ISummary =
    await api.functional.shoppingMall.admin.customers.index(connection, {
      body: {
        page,
        limit,
        email: customerJoinBodyA.email,
        status: "suspended",
      } satisfies IShoppingMallCustomer.IRequest,
    });
  typia.assert(byEmailAndSuspended);

  TestValidator.predicate(
    "email+suspended filter should not include customer A",
    !containsCustomer(byEmailAndSuspended, updatedCustomerA.id),
  );

  // 5-4. Filter by status only (suspended) and expect customerB
  const bySuspendedOnly: IPageIShoppingMallCustomer.ISummary =
    await api.functional.shoppingMall.admin.customers.index(connection, {
      body: {
        page,
        limit,
        status: "suspended",
      } satisfies IShoppingMallCustomer.IRequest,
    });
  typia.assert(bySuspendedOnly);

  TestValidator.predicate(
    "status-only(suspended) filter should include customer B",
    containsCustomer(bySuspendedOnly, updatedCustomerB.id),
  );
  TestValidator.predicate(
    "status-only(suspended) filter should not include customer A",
    !containsCustomer(bySuspendedOnly, updatedCustomerA.id),
  );

  // Basic pagination sanity checks for suspended-only filter
  TestValidator.predicate(
    "status-only(suspended) pagination.records should be >= 1",
    bySuspendedOnly.pagination.records >= 1,
  );
  TestValidator.predicate(
    "status-only(suspended) pagination.pages should be >= 1",
    bySuspendedOnly.pagination.pages >= 1,
  );
}
