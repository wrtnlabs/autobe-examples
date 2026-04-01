import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
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
 * Test customer session date range filtering functionality.
 * 1. Customer registers with unique credentials
 * 2. Customer logs in (creates active session)
 * 3. Retrieve sessions with date range that includes current session
 * 4. Retrieve sessions with historical date range excluding current session
 * 5. Validate pagination metadata reflects filtered results
 * 6. Verify session data structure and date filtering behavior
 */
export async function test_api_customer_session_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration with unique credentials
  const password = RandomGenerator.alphaNumeric(16);
  const email = typia.random<string & tags.Format<"email">>();
  const customerJoin = await authorize_customer_join(connection, {
    body: {
      email: email,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);
  // 2. Customer login to create active session
  const customerLogin = await authorize_customer_login(connection, {
    body: {
      email: email,
      password: password,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(customerLogin);
  // 3. Create customer-specific connection with auth token
  const customerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${customerLogin.token.access}`,
    },
  };
  // 4. Get current time for date range calculations
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  // 5. Test date range filtering - range including current session
  const sessionsInRange =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          created_at_from: oneHourAgo.toISOString(),
          created_at_to: oneHourLater.toISOString(),
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(sessionsInRange);
  // Validate that current session is included in results
  TestValidator.predicate(
    "sessions returned for range including current session",
    sessionsInRange.data.length > 0,
  );
  // 6. Test date range filtering - historical range excluding current session
  const oldDate = new Date("2020-01-01T00:00:00.000Z");
  const olderDate = new Date("2020-01-02T00:00:00.000Z");
  const sessionsHistorical =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          created_at_from: oldDate.toISOString(),
          created_at_to: olderDate.toISOString(),
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(sessionsHistorical);
  // Historical range should return empty since no sessions exist from 2020
  TestValidator.equals(
    "no sessions in historical range",
    sessionsHistorical.data.length,
    0,
  );
  // 7. Validate pagination metadata for inclusive range
  TestValidator.predicate(
    "pagination current page valid",
    sessionsInRange.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    sessionsInRange.pagination.limit >= 1,
  );
  TestValidator.equals(
    "pagination records matches data length",
    sessionsInRange.pagination.records,
    sessionsInRange.data.length,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    sessionsInRange.pagination.pages >= 0,
  );
  // 8. Validate session data structure
  if (sessionsInRange.data.length > 0) {
    const session = sessionsInRange.data[0];
    TestValidator.predicate("session has valid UUID id", session.id.length > 0);
    TestValidator.predicate(
      "session has created_at timestamp",
      session.created_at.length > 0,
    );
    TestValidator.predicate(
      "session has expired_at timestamp",
      session.expired_at.length > 0,
    );
    TestValidator.predicate(
      "session is_active is boolean",
      typeof session.is_active === "boolean",
    );
    TestValidator.predicate(
      "session is_current is boolean",
      typeof session.is_current === "boolean",
    );
    // Verify at least one session is marked as current
    const hasCurrentSession = sessionsInRange.data.some((s) => s.is_current);
    TestValidator.predicate(
      "at least one session is current",
      hasCurrentSession,
    );
  }
  // 9. Test with only created_at_from filter (no upper bound)
  const sessionsFromOnly =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          created_at_from: oneHourAgo.toISOString(),
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(sessionsFromOnly);
  TestValidator.predicate(
    "sessions returned with from-only filter",
    sessionsFromOnly.data.length > 0,
  );
  // 10. Test with only created_at_to filter (no lower bound)
  const sessionsToOnly =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          created_at_to: oneHourLater.toISOString(),
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(sessionsToOnly);
  TestValidator.predicate(
    "sessions returned with to-only filter",
    sessionsToOnly.data.length > 0,
  );
}
