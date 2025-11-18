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
 * Admin drills down from a customer's session listing into a specific session
 * detail.
 *
 * Business purpose:
 *
 * - Ensure that an authenticated admin can:
 *
 *   1. List customers,
 *   2. List sessions for a chosen customer,
 *   3. Fetch detailed metadata for a specific session, and
 *   4. See consistent identifiers across list and detail responses.
 *
 * High level flow:
 *
 * 1. Join as an admin using /auth/admin/join, which also attaches Authorization
 *    header.
 * 2. Search customers using PATCH /shoppingMall/admin/customers.
 * 3. If at least one customer exists, pick the first one's id.
 * 4. List that customer's sessions using PATCH
 *    /shoppingMall/admin/customers/{customerId}/sessions.
 * 5. If at least one session exists, pick its id.
 * 6. Call GET /shoppingMall/admin/customers/{customerId}/sessions/{sessionId}.
 * 7. Assert that detailed session data matches the summary (id and customerId).
 */
export async function test_api_admin_customer_session_detail_view_after_listing(
  connection: api.IConnection,
) {
  // 1. Join as an admin to obtain an authorized context.
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Search for customers (admin-only operation).
  const customerSearchBody = typia.random<IShoppingMallCustomer.IRequest>();
  const customerPage: IPageIShoppingMallCustomer.ISummary =
    await api.functional.shoppingMall.admin.customers.index(connection, {
      body: customerSearchBody,
    });
  typia.assert<IPageIShoppingMallCustomer.ISummary>(customerPage);

  // If there are no customers, we can only validate shape and exit early.
  if (customerPage.data.length === 0) return;

  const customerSummary = customerPage.data[0];
  typia.assert<IShoppingMallCustomer.ISummary>(customerSummary);

  // 3. List sessions for the chosen customer.
  const sessionSearchBody =
    typia.random<IShoppingMallCustomerSession.IRequest>();
  const sessionPage: IPageIShoppingMallCustomerSession.ISummary =
    await api.functional.shoppingMall.admin.customers.sessions.index(
      connection,
      {
        customerId: customerSummary.id,
        body: sessionSearchBody,
      },
    );
  typia.assert<IPageIShoppingMallCustomerSession.ISummary>(sessionPage);

  // If the customer has no sessions, validate structure only and exit.
  if (sessionPage.data.length === 0) return;

  const sessionSummary = sessionPage.data[0];
  typia.assert<IShoppingMallCustomerSession.ISummary>(sessionSummary);

  // 4. Fetch detailed information for the selected session.
  const sessionDetail: IShoppingMallCustomerSession =
    await api.functional.shoppingMall.admin.customers.sessions.at(connection, {
      customerId: sessionSummary.customer.id,
      sessionId: sessionSummary.id,
    });
  typia.assert<IShoppingMallCustomerSession>(sessionDetail);

  // 5. Validate cross-entity consistency.
  TestValidator.equals(
    "session id in detail matches summary id",
    sessionDetail.id,
    sessionSummary.id,
  );
  TestValidator.equals(
    "customer id in detail matches summary.customer.id",
    sessionDetail.customerId,
    sessionSummary.customer.id,
  );
}
