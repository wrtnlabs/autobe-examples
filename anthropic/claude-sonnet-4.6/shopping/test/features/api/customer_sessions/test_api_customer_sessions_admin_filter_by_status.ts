import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sessions_admin_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create customer connection (creates an active session)
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(
    customerConnection,
    {},
  );
  typia.assert(customerAuthorized);
  const customerId = customerAuthorized.id;
  // Compute date range timestamps
  const now = new Date();
  const oneHourAgo = new Date(
    now.getTime() - 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const oneHourFromNow = new Date(
    now.getTime() + 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const oneYearAgo = new Date(
    now.getTime() - 365 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const twoYearsAgo = new Date(
    now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  // --- Test: Active Filter ---
  const activeSessions =
    await api.functional.shoppingMall.admin.customers.sessions.index(
      adminConnection,
      {
        customerId,
        body: {
          status: "active",
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(activeSessions);
  // Verify at least one active session (from join)
  TestValidator.predicate(
    "active sessions non-empty",
    activeSessions.data.length > 0,
  );
  // Verify all returned sessions are active
  for (const session of activeSessions.data) {
    TestValidator.predicate("session is active", session.is_active === true);
  }
  // --- Test: Expired Filter ---
  const expiredSessions =
    await api.functional.shoppingMall.admin.customers.sessions.index(
      adminConnection,
      {
        customerId,
        body: {
          status: "expired",
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(expiredSessions);
  // All returned expired sessions should have is_active === false
  for (const session of expiredSessions.data) {
    TestValidator.predicate(
      "expired session is not active",
      session.is_active === false,
    );
  }
  // --- Test: Date Range Filter (valid range covering now) ---
  const rangeSessionsValid =
    await api.functional.shoppingMall.admin.customers.sessions.index(
      adminConnection,
      {
        customerId,
        body: {
          createdAtFrom: oneHourAgo,
          createdAtTo: oneHourFromNow,
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(rangeSessionsValid);
  // Should have at least one session created within this range (the join session)
  TestValidator.predicate(
    "valid date range returns sessions",
    rangeSessionsValid.data.length > 0,
  );
  // --- Test: Date Range Filter (past range with no sessions: 2 years ago to 1 year ago) ---
  const rangeSessionsEmpty =
    await api.functional.shoppingMall.admin.customers.sessions.index(
      adminConnection,
      {
        customerId,
        body: {
          createdAtFrom: twoYearsAgo,
          createdAtTo: oneYearAgo,
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(rangeSessionsEmpty);
  // Should return empty result (customer was just created, no sessions in that old range)
  TestValidator.equals(
    "old date range returns empty result",
    rangeSessionsEmpty.data.length,
    0,
  );
  // --- Test: Combined Filter (active status + date range from 1 hour ago) ---
  const combinedSessions =
    await api.functional.shoppingMall.admin.customers.sessions.index(
      adminConnection,
      {
        customerId,
        body: {
          status: "active",
          createdAtFrom: oneHourAgo,
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(combinedSessions);
  // All results must be active sessions
  for (const session of combinedSessions.data) {
    TestValidator.predicate(
      "combined filter: session is active",
      session.is_active === true,
    );
  }
}
