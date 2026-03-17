import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSession";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer session filtering by status (active vs expired).
 *
 * This test verifies that the session filtering functionality correctly
 * distinguishes between active and expired sessions. The customer authenticates
 * to create an active session, then queries sessions with status filters to
 * ensure proper filtering logic.
 *
 * Test flow:
 * 1. Customer joins/registers to create an active session
 * 2. Query sessions with status='active' - should return the current session
 * 3. Query sessions with status='expired' - should return empty or only expired sessions
 * 4. Validate isActive field matches expected status for each result
 * 5. Validate pagination reflects correct filtered counts
 */
export async function test_api_customer_session_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authenticates to create an active session
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  // 2. Query sessions with status='active' filter
  const activeSessions =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          status: "active",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(activeSessions);
  // Validate active sessions
  TestValidator.predicate(
    "active sessions returned",
    activeSessions.data.length >= 1,
  );
  TestValidator.predicate(
    "all active sessions have expired_at in future",
    activeSessions.data.every(
      (session) => new Date(session.expired_at).getTime() > Date.now(),
    ),
  );
  TestValidator.predicate(
    "all active sessions have isActive=true",
    activeSessions.data.every((session) => session.isActive === true),
  );
  // 3. Query sessions with status='expired' filter
  const expiredSessions =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          status: "expired",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(expiredSessions);
  // Validate expired sessions
  TestValidator.predicate(
    "all expired sessions have expired_at in past",
    expiredSessions.data.every(
      (session) => new Date(session.expired_at).getTime() <= Date.now(),
    ),
  );
  TestValidator.predicate(
    "all expired sessions have isActive=false",
    expiredSessions.data.every((session) => session.isActive === false),
  );
  // 4. Validate pagination
  TestValidator.equals(
    "active pagination current page",
    activeSessions.pagination.current,
    1,
  );
  TestValidator.predicate(
    "active pagination records matches data length",
    activeSessions.pagination.records >= activeSessions.data.length,
  );
  TestValidator.equals(
    "expired pagination current page",
    expiredSessions.pagination.current,
    1,
  );
  TestValidator.predicate(
    "expired pagination records matches data length",
    expiredSessions.pagination.records >= expiredSessions.data.length,
  );
}
