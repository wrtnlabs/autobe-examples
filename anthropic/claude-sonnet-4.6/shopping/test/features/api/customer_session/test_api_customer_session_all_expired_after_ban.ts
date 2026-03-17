import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_customer_session_all_expired_after_ban(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a super administrator and create their authenticated connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Register a customer — this creates an active session record
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  const customerId = customerAuth.id;
  // 3. Ban the customer — this should invalidate all their active sessions
  const bannedCustomer =
    await api.functional.shoppingMall.superAdmin.customers.ban(
      superAdminConnection,
      { customerId },
    );
  typia.assert(bannedCustomer);
  TestValidator.predicate(
    "customer is banned after ban operation",
    bannedCustomer.isBanned,
  );
  // 4. Verify all sessions (no filter) — all should be expired after ban
  const allSessionsPage =
    await api.functional.shoppingMall.superAdmin.customers.sessions.index(
      superAdminConnection,
      {
        customerId,
        body: {} satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(allSessionsPage);
  // Assert that at least 1 session record exists (historical records preserved)
  TestValidator.predicate(
    "at least one session record exists after ban",
    allSessionsPage.pagination.records >= 1,
  );
  // Assert ALL sessions are expired (is_active === false)
  TestValidator.predicate(
    "all sessions are expired after ban",
    allSessionsPage.data.every((session) => session.is_active === false),
  );
  // 5. Verify active filter returns no results
  const activeSessionsPage =
    await api.functional.shoppingMall.superAdmin.customers.sessions.index(
      superAdminConnection,
      {
        customerId,
        body: {
          status: "active",
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(activeSessionsPage);
  TestValidator.equals(
    "no active sessions after ban",
    activeSessionsPage.pagination.records,
    0,
  );
  // 6. Verify expired filter returns all sessions
  const expiredSessionsPage =
    await api.functional.shoppingMall.superAdmin.customers.sessions.index(
      superAdminConnection,
      {
        customerId,
        body: {
          status: "expired",
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(expiredSessionsPage);
  TestValidator.predicate(
    "expired filter returns at least one session record",
    expiredSessionsPage.pagination.records >= 1,
  );
  // All sessions via expired filter should also have is_active === false
  TestValidator.predicate(
    "all sessions from expired filter are inactive",
    expiredSessionsPage.data.every((session) => session.is_active === false),
  );
  // Cross-validate: total records (no filter) matches expired records count
  TestValidator.equals(
    "expired records count matches total records count",
    expiredSessionsPage.pagination.records,
    allSessionsPage.pagination.records,
  );
}
