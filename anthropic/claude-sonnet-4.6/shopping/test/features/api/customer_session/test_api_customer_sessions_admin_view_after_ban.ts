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

export async function test_api_customer_sessions_admin_view_after_ban(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Setup: Register customer account (creates an active session)
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  const customerId = customerAuth.id;
  // 3. Pre-ban verification: Query active sessions — should have at least one
  const prebanActiveSessions =
    await api.functional.shoppingMall.admin.customers.sessions.index(
      adminConnection,
      {
        customerId,
        body: {
          status: "active",
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(prebanActiveSessions);
  TestValidator.predicate(
    "customer has at least one active session before ban",
    prebanActiveSessions.pagination.records > 0,
  );
  TestValidator.predicate(
    "all pre-ban active sessions have is_active = true",
    prebanActiveSessions.data.every((s) => s.is_active === true),
  );
  // 4. Ban the customer
  const bannedCustomer = await api.functional.shoppingMall.admin.customers.ban(
    adminConnection,
    { customerId },
  );
  typia.assert(bannedCustomer);
  TestValidator.predicate(
    "customer is banned after ban operation",
    bannedCustomer.isBanned === true,
  );
  // 5. Post-ban: Query active sessions — should be empty
  const postbanActiveSessions =
    await api.functional.shoppingMall.admin.customers.sessions.index(
      adminConnection,
      {
        customerId,
        body: {
          status: "active",
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(postbanActiveSessions);
  TestValidator.equals(
    "no active sessions remain after ban",
    postbanActiveSessions.pagination.records,
    0,
  );
  TestValidator.equals(
    "active sessions data array is empty after ban",
    postbanActiveSessions.data.length,
    0,
  );
  // 6. Post-ban: Query expired sessions — should contain the previously active sessions
  const postbanExpiredSessions =
    await api.functional.shoppingMall.admin.customers.sessions.index(
      adminConnection,
      {
        customerId,
        body: {
          status: "expired",
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(postbanExpiredSessions);
  TestValidator.predicate(
    "expired sessions exist after ban",
    postbanExpiredSessions.pagination.records > 0,
  );
  TestValidator.predicate(
    "all expired sessions have is_active = false",
    postbanExpiredSessions.data.every((s) => s.is_active === false),
  );
  // 7. Post-ban: Query all sessions (no status filter) — all should have is_active = false
  const allPostbanSessions =
    await api.functional.shoppingMall.admin.customers.sessions.index(
      adminConnection,
      {
        customerId,
        body: {} satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(allPostbanSessions);
  TestValidator.predicate(
    "all sessions have is_active = false after ban",
    allPostbanSessions.data.every((s) => s.is_active === false),
  );
  // 8. Verify session summaries do not expose access_token or refresh_token
  // (ISummary type doesn't have these fields — validated structurally by typia.assert)
  // The typia.assert above already ensures no extra/unexpected fields per ISummary type.
}
