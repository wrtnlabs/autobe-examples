import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test filtering sessions by expiration status to view only active sessions.
 *
 * 1. Customer registration and authentication
 * 2. Retrieve active sessions with expired=false filter
 * 3. Verify all returned sessions have expired_at > NOW()
 * 4. Validate pagination metadata reflects active sessions only
 */
export async function test_api_customer_sessions_active_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - create actor-specific connection
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Get active sessions (expired=false to filter out expired sessions)
  const activeSessions =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          expired: false,
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(activeSessions);
  // 3. Verify all returned sessions have expired_at in the future
  const now = new Date();
  for (const session of activeSessions.data) {
    const expiredAt = new Date(session.expiredAt);
    TestValidator.predicate(
      "active session should have expired_at in the future",
      expiredAt > now,
    );
  }
  // 4. Validate pagination metadata reflects active sessions count
  TestValidator.predicate(
    "pagination records should match or exceed data length",
    activeSessions.pagination.records >= activeSessions.data.length,
  );
}
