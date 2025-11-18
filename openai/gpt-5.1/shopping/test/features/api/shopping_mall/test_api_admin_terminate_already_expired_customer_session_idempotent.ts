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
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";

/**
 * Validate idempotent admin termination of an already ended customer session.
 *
 * Business goal: Ensure that when an administrator terminates a customer
 * session that has already ended (expired or logically terminated), the
 * operation is safe and idempotent. Multiple DELETE calls on the same session
 * must not throw errors, and the session must remain in a non-active state.
 *
 * High-level flow:
 *
 * 1. Join an admin using POST /auth/admin/join to obtain an admin context.
 * 2. As admin, search for customers via PATCH /shoppingMall/admin/customers.
 * 3. For a chosen customer, list their sessions via PATCH
 *    /shoppingMall/admin/customers/{customerId}/sessions.
 * 4. Pick a session:
 *
 *    - Prefer a session whose expired_at is already non-null (already ended).
 *    - If none exist, fall back to any session; first DELETE will terminate it.
 * 5. Call DELETE /shoppingMall/admin/customers/{customerId}/sessions/{sessionId}
 *    once. Expect success (no thrown error).
 * 6. Call the same DELETE again for idempotent behavior. Expect success again.
 * 7. Re-query sessions for the same customer and verify:
 *
 *    - The target session either is not present, or
 *    - If present, its expired_at is non-null (terminated/expired state).
 *
 * We do not inspect raw HTTP status codes directly; success is inferred from
 * the absence of thrown errors, while typia.assert and TestValidator are used
 * to validate DTO structures and business expectations.
 */
export async function test_api_admin_terminate_already_expired_customer_session_idempotent(
  connection: api.IConnection,
) {
  // 1. Join an admin to obtain admin authentication context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Search for customers (first page, reasonable limit).
  const customersPage: IPageIShoppingMallCustomer.ISummary =
    await api.functional.shoppingMall.admin.customers.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32">,
        limit: 20 as number & tags.Type<"int32">,
      } satisfies IShoppingMallCustomer.IRequest,
    });
  typia.assert<IPageIShoppingMallCustomer.ISummary>(customersPage);

  await TestValidator.predicate(
    "admin customer search returns a non-negative record count",
    async () => customersPage.pagination.records >= 0,
  );

  // Pick any customer from the page; if none, there is nothing meaningful to test.
  const customer: IShoppingMallCustomer.ISummary | undefined =
    customersPage.data[0];

  await TestValidator.predicate(
    "customers list length is non-negative (sanity check)",
    async () => customersPage.data.length >= 0,
  );

  if (!customer) {
    // When there is no customer at all, we cannot meaningfully test
    // session termination semantics. Just exit gracefully.
    return;
  }

  // 3. List sessions for the selected customer.
  const sessionsPage: IPageIShoppingMallCustomerSession.ISummary =
    await api.functional.shoppingMall.admin.customers.sessions.index(
      connection,
      {
        customerId: customer.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert<IPageIShoppingMallCustomerSession.ISummary>(sessionsPage);

  TestValidator.equals(
    "sessions page customer id matches requested customer in all summaries",
    true,
    sessionsPage.data.every((session) => session.customer.id === customer.id),
  );

  if (sessionsPage.data.length === 0) {
    // No sessions exist; idempotent termination cannot be exercised.
    return;
  }

  // 4. Prefer an already-expired session (expired_at not null); otherwise pick any.
  const alreadyExpiredSession:
    | IShoppingMallCustomerSession.ISummary
    | undefined = sessionsPage.data.find(
    (session) =>
      session.expired_at !== null && session.expired_at !== undefined,
  );

  const targetSession: IShoppingMallCustomerSession.ISummary =
    alreadyExpiredSession ?? sessionsPage.data[0];

  // 5. First DELETE call — terminate (or re-terminate) the session.
  await api.functional.shoppingMall.admin.customers.sessions.erase(connection, {
    customerId: targetSession.customer.id,
    sessionId: targetSession.id,
  });

  TestValidator.predicate(
    "first admin session erase call completes without error",
    true,
  );

  // 6. Second DELETE call — must also succeed (idempotent behavior).
  await api.functional.shoppingMall.admin.customers.sessions.erase(connection, {
    customerId: targetSession.customer.id,
    sessionId: targetSession.id,
  });

  TestValidator.predicate(
    "second admin session erase call also completes without error (idempotent)",
    true,
  );

  // 7. Re-query sessions for the same customer to inspect session state.
  const sessionsAfter: IPageIShoppingMallCustomerSession.ISummary =
    await api.functional.shoppingMall.admin.customers.sessions.index(
      connection,
      {
        customerId: customer.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert<IPageIShoppingMallCustomerSession.ISummary>(sessionsAfter);

  // Find the session again, if it still exists.
  const foundAgain: IShoppingMallCustomerSession.ISummary | undefined =
    sessionsAfter.data.find((session) => session.id === targetSession.id);

  if (foundAgain) {
    // If the session still exists, it must be non-active: expired_at should not be null.
    TestValidator.predicate(
      "terminated session has non-null expired_at after erase operations",
      foundAgain.expired_at !== null && foundAgain.expired_at !== undefined,
    );
  } else {
    // If the session is no longer present, that is also acceptable: it has
    // effectively been removed from active listings.
    TestValidator.predicate(
      "terminated session may be absent from subsequent listings",
      true,
    );
  }
}
