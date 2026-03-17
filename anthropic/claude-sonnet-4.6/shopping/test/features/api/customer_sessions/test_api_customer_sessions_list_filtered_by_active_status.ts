import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSuperAdminSession";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sessions_list_filtered_by_active_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer to create an active session
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Retrieve only active sessions (isActive: true)
  const activeSessions =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          isActive: true,
        } satisfies IShoppingMallSuperAdminSession.IRequest,
      },
    );
  typia.assert(activeSessions);
  // 3. Validate all returned sessions have isActive = true
  for (const session of activeSessions.data) {
    TestValidator.equals(
      "session isActive should be true",
      session.isActive,
      true,
    );
  }
  // 4. Verify pagination: at least 1 active session should exist (the join session)
  TestValidator.predicate(
    "at least one active session should exist after join",
    activeSessions.pagination.records >= 1,
  );
  // 5. Retrieve only inactive/expired sessions (isActive: false)
  const inactiveSessions =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          isActive: false,
        } satisfies IShoppingMallSuperAdminSession.IRequest,
      },
    );
  typia.assert(inactiveSessions);
  // 6. Validate all returned inactive sessions have isActive = false
  for (const session of inactiveSessions.data) {
    TestValidator.equals(
      "session isActive should be false",
      session.isActive,
      false,
    );
  }
  // 7. Retrieve all sessions without any isActive filter
  const allSessions = await api.functional.shoppingMall.customer.sessions.index(
    customerConnection,
    {
      body: {} satisfies IShoppingMallSuperAdminSession.IRequest,
    },
  );
  typia.assert(allSessions);
  // 8. Confirm union of active + inactive equals total records count
  TestValidator.equals(
    "active + inactive sessions should equal total sessions",
    activeSessions.pagination.records + inactiveSessions.pagination.records,
    allSessions.pagination.records,
  );
}
