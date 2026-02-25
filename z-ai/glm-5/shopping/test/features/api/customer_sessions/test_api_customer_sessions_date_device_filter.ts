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
 * Test advanced filtering capabilities combining date range and device name filters.
 * Validates that customer sessions can be filtered by creation date range and
 * device name (ILIKE pattern match on user_agent), with proper pagination support.
 */
export async function test_api_customer_sessions_date_device_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Get sessions without filter to establish baseline
  const allSessions = await api.functional.shoppingMall.customer.sessions.index(
    customerConnection,
    {
      body: {} satisfies IShoppingMallCustomerSession.IRequest,
    },
  );
  typia.assert(allSessions);
  // 3. Define date range (current session should be within this range)
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  // 4. Test date range filter - should include current session
  const dateFiltered =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          createdFrom: oneHourAgo.toISOString(),
          createdTo: oneHourLater.toISOString(),
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(dateFiltered);
  // Verify sessions are within date range
  for (const session of dateFiltered.data) {
    const createdAt = new Date(session.createdAt).getTime();
    TestValidator.predicate(
      "session created within date range",
      createdAt >= oneHourAgo.getTime() && createdAt <= oneHourLater.getTime(),
    );
  }
  // 5. Test device name filter (ILIKE pattern on user_agent)
  // Common user agents contain "Mozilla" - this should match most sessions
  const deviceFiltered =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          deviceName: "Mozilla",
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(deviceFiltered);
  // Verify sessions have user agent matching the pattern
  for (const session of deviceFiltered.data) {
    TestValidator.predicate(
      "session user agent contains filter pattern",
      session.userAgent !== null &&
        session.userAgent.toLowerCase().includes("mozilla"),
    );
  }
  // 6. Test combined filters (date range AND device name)
  const combinedFiltered =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          createdFrom: oneHourAgo.toISOString(),
          createdTo: oneHourLater.toISOString(),
          deviceName: "Mozilla",
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(combinedFiltered);
  // Verify sessions match both filters
  for (const session of combinedFiltered.data) {
    const createdAt = new Date(session.createdAt).getTime();
    TestValidator.predicate(
      "session matches both date and device filters",
      createdAt >= oneHourAgo.getTime() &&
        createdAt <= oneHourLater.getTime() &&
        session.userAgent !== null &&
        session.userAgent.toLowerCase().includes("mozilla"),
    );
  }
  // 7. Test pagination with filters applied
  const paginatedResult =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          createdFrom: oneHourAgo.toISOString(),
          createdTo: oneHourLater.toISOString(),
          page: 1,
          limit: 1,
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(paginatedResult);
  // Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", paginatedResult.pagination.limit, 1);
  TestValidator.predicate(
    "pagination records matches total",
    paginatedResult.data.length <= 1,
  );
  // 8. Test empty results with non-matching filters
  const farFuture = new Date("2099-12-31T23:59:59.000Z");
  const farFuture2 = new Date("2100-01-01T23:59:59.000Z");
  const emptyResult = await api.functional.shoppingMall.customer.sessions.index(
    customerConnection,
    {
      body: {
        createdFrom: farFuture.toISOString(),
        createdTo: farFuture2.toISOString(),
      } satisfies IShoppingMallCustomerSession.IRequest,
    },
  );
  typia.assert(emptyResult);
  // Verify empty result returns valid IPage structure
  TestValidator.equals("empty result data array", emptyResult.data.length, 0);
  TestValidator.equals(
    "empty result records count",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result pages count",
    emptyResult.pagination.pages,
    0,
  );
}
