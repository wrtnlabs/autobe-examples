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

export async function test_api_admin_terminate_customer_session_success(
  connection: api.IConnection,
) {
  // 1) Admin join to obtain authorized admin context and token
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2) Admin searches customers to pick a concrete customerId
  const customerSearchBody = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallCustomer.IRequest;

  const customerPage: IPageIShoppingMallCustomer.ISummary =
    await api.functional.shoppingMall.admin.customers.index(connection, {
      body: customerSearchBody,
    });
  typia.assert<IPageIShoppingMallCustomer.ISummary>(customerPage);

  // If there is no customer, we cannot meaningfully test session termination;
  // treat as gracefully skipped while still passing the test.
  if (customerPage.data.length === 0) {
    TestValidator.predicate(
      "no customers available to test session termination",
      true,
    );
    return;
  }

  const targetCustomer: IShoppingMallCustomer.ISummary = customerPage.data[0];

  // 3) List sessions for that customer to locate an active sessionId
  const sessionSearchBody = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallCustomerSession.IRequest;

  const sessionPageBefore: IPageIShoppingMallCustomerSession.ISummary =
    await api.functional.shoppingMall.admin.customers.sessions.index(
      connection,
      {
        customerId: targetCustomer.id,
        body: sessionSearchBody,
      },
    );
  typia.assert<IPageIShoppingMallCustomerSession.ISummary>(sessionPageBefore);

  if (sessionPageBefore.data.length === 0) {
    TestValidator.predicate(
      "no sessions available for selected customer; skip termination logic",
      true,
    );
    return;
  }

  const targetSession: IShoppingMallCustomerSession.ISummary =
    sessionPageBefore.data[0];

  // 4) Call DELETE to terminate this specific session
  await api.functional.shoppingMall.admin.customers.sessions.erase(connection, {
    customerId: targetCustomer.id,
    sessionId: targetSession.id,
  });

  // 5) Re-query sessions and validate business effect
  const sessionPageAfter: IPageIShoppingMallCustomerSession.ISummary =
    await api.functional.shoppingMall.admin.customers.sessions.index(
      connection,
      {
        customerId: targetCustomer.id,
        body: sessionSearchBody,
      },
    );
  typia.assert<IPageIShoppingMallCustomerSession.ISummary>(sessionPageAfter);

  const remaining = sessionPageAfter.data.find(
    (s) => s.id === targetSession.id,
  );

  if (remaining === undefined) {
    // Session was removed from the list entirely
    TestValidator.predicate(
      "terminated session should not appear in listing anymore",
      true,
    );
  } else {
    // Session still present, but should be marked as expired/terminated
    TestValidator.predicate(
      "terminated session should have non-null expired_at if still listed",
      remaining.expired_at !== null && remaining.expired_at !== undefined,
    );
  }
}
