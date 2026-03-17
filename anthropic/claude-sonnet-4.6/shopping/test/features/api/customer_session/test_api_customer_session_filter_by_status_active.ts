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

export async function test_api_customer_session_filter_by_status_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super admin setup
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Customer setup — creates an active session upon join
  const customerConnection: api.IConnection = { host: connection.host };
  const beforeJoin = new Date().toISOString();
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  const afterJoin = new Date().toISOString();
  const customerId = customerAuth.id;
  // 3. Filter by status = 'active'
  const activeSessions =
    await api.functional.shoppingMall.superAdmin.customers.sessions.index(
      superAdminConnection,
      {
        customerId,
        body: {
          status: "active",
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(activeSessions);
  // All returned sessions must be active
  TestValidator.predicate(
    "active filter: records >= 1",
    activeSessions.pagination.records >= 1,
  );
  for (const session of activeSessions.data) {
    TestValidator.predicate(
      "active session has is_active true",
      session.is_active === true,
    );
  }
  // 4. Filter by status = 'expired' — no expired sessions yet
  const expiredSessions =
    await api.functional.shoppingMall.superAdmin.customers.sessions.index(
      superAdminConnection,
      {
        customerId,
        body: {
          status: "expired",
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(expiredSessions);
  TestValidator.equals(
    "expired filter: records = 0",
    expiredSessions.pagination.records,
    0,
  );
  TestValidator.equals(
    "expired filter: data is empty",
    expiredSessions.data.length,
    0,
  );
  // 5. Filter by date range (matching — should include the join session)
  const dateRangeResult =
    await api.functional.shoppingMall.superAdmin.customers.sessions.index(
      superAdminConnection,
      {
        customerId,
        body: {
          createdAtFrom: beforeJoin,
          createdAtTo: afterJoin,
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filter: join session appears",
    dateRangeResult.pagination.records >= 1,
  );
  // 6. Filter by date range in the far future — no sessions expected
  const futureRangeResult =
    await api.functional.shoppingMall.superAdmin.customers.sessions.index(
      superAdminConnection,
      {
        customerId,
        body: {
          createdAtFrom: "2099-01-01T00:00:00.000Z",
          createdAtTo: "2099-12-31T23:59:59.999Z",
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(futureRangeResult);
  TestValidator.equals(
    "future date range: records = 0",
    futureRangeResult.pagination.records,
    0,
  );
  // 7. Filter by IP — use IP from a retrieved active session
  if (activeSessions.data.length > 0) {
    const knownIp = activeSessions.data[0]!.ip;
    const ipMatchResult =
      await api.functional.shoppingMall.superAdmin.customers.sessions.index(
        superAdminConnection,
        {
          customerId,
          body: {
            ip: knownIp,
          } satisfies IShoppingMallCustomerSession.IRequest,
        },
      );
    typia.assert(ipMatchResult);
    // All returned sessions should have the same IP
    for (const session of ipMatchResult.data) {
      TestValidator.equals(
        "ip filter: session ip matches",
        session.ip,
        knownIp,
      );
    }
    // 8. Filter by non-existent IP — expect empty results
    const noIpResult =
      await api.functional.shoppingMall.superAdmin.customers.sessions.index(
        superAdminConnection,
        {
          customerId,
          body: {
            ip: "192.0.2.255",
          } satisfies IShoppingMallCustomerSession.IRequest,
        },
      );
    typia.assert(noIpResult);
    TestValidator.equals(
      "non-existent ip filter: records = 0",
      noIpResult.pagination.records,
      0,
    );
  }
}
