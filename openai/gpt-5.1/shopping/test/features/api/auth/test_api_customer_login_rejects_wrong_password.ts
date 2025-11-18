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
 * Verify that customer login rejects an incorrect password without mutating
 * audit fields or creating new sessions.
 *
 * Business workflow under test:
 *
 * 1. Register a new customer via POST /auth/customer/join with a known email and
 *    password.
 * 2. Join an admin via POST /auth/admin/join to obtain admin context.
 * 3. As admin, read the customer's detail record to capture the baseline
 *    `last_login_at`.
 * 4. As admin, list the customer's sessions to capture the baseline session count.
 * 5. Attempt POST /auth/customer/login with the same email but a wrong password,
 *    asserting that the call fails with an error (no token issuance).
 * 6. Re-join an admin to ensure admin context is active again.
 * 7. As admin, re-read the customer detail and assert that `last_login_at` remains
 *    unchanged after the failed login attempt.
 * 8. As admin, re-list the customer's sessions and assert that the total session
 *    record count has not increased.
 *
 * Business validation:
 *
 * - Incorrect credentials must be rejected without issuing a customer token.
 * - A failed login must not update `shopping_mall_customers.last_login_at`.
 * - A failed login must not create a new `shopping_mall_customer_sessions` row.
 */
export async function test_api_customer_login_rejects_wrong_password(
  connection: api.IConnection,
) {
  // 1. Register a new customer with known credentials
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const correctPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const customerJoinBody = {
    email: customerEmail,
    password: correctPassword,
    ip: null,
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerId = customerAuthorized.id;

  // 2. Join an admin to gain admin context for reading customer details/sessions
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
  typia.assert(adminAuthorized);

  // 3. Read customer details before failed login to capture baseline last_login_at
  const beforeCustomer: IShoppingMallCustomer =
    await api.functional.shoppingMall.admin.customers.at(connection, {
      customerId,
    });
  typia.assert(beforeCustomer);

  const beforeLastLoginAt = beforeCustomer.last_login_at ?? null;

  // 4. Query existing sessions before failed login
  const beforeSessionsRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCustomerSession.IRequest;

  const beforeSessionsPage: IPageIShoppingMallCustomerSession.ISummary =
    await api.functional.shoppingMall.admin.customers.sessions.index(
      connection,
      {
        customerId,
        body: beforeSessionsRequestBody,
      },
    );
  typia.assert(beforeSessionsPage);

  const beforeSessionCount = beforeSessionsPage.pagination.records;

  // 5. Attempt customer login with wrong password.
  //    This should fail and must not create a session or update last_login_at.
  const wrongPassword: string = RandomGenerator.alphaNumeric(16);

  const wrongLoginBody = {
    email: customerEmail,
    password: wrongPassword,
    ip: null,
    href: "https://customer.example.com/login",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerLogin.IRequest;

  await TestValidator.error("wrong password login must fail", async () => {
    await api.functional.auth.customer.login(connection, {
      body: wrongLoginBody,
    });
  });

  // 6. Re-establish admin context to safely call admin endpoints again
  const adminRejoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminReAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminRejoinBody,
    });
  typia.assert(adminReAuthorized);

  // 7. Verify that last_login_at has not changed after failed login
  const afterCustomer: IShoppingMallCustomer =
    await api.functional.shoppingMall.admin.customers.at(connection, {
      customerId,
    });
  typia.assert(afterCustomer);

  const afterLastLoginAt = afterCustomer.last_login_at ?? null;

  TestValidator.equals(
    "last_login_at unchanged after failed customer login",
    afterLastLoginAt,
    beforeLastLoginAt,
  );

  // 8. Verify that no new session has been created
  const afterSessionsRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallCustomerSession.IRequest;

  const afterSessionsPage: IPageIShoppingMallCustomerSession.ISummary =
    await api.functional.shoppingMall.admin.customers.sessions.index(
      connection,
      {
        customerId,
        body: afterSessionsRequestBody,
      },
    );
  typia.assert(afterSessionsPage);

  const afterSessionCount = afterSessionsPage.pagination.records;

  TestValidator.equals(
    "no new session created after failed customer login",
    afterSessionCount,
    beforeSessionCount,
  );
}
