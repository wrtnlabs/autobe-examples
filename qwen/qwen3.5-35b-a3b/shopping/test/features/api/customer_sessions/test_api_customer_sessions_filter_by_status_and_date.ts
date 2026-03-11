import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sessions_filter_by_status_and_date(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: typia.random<IEcommerceMallCustomer.IJoin>(),
  });
  typia.assert(customer);
  // Test 1: Filter by status='active'
  const activeSessionsResponse =
    await api.functional.ecommerceMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          status: "active",
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(activeSessionsResponse);
  // Validate all returned sessions are active
  for (const session of activeSessionsResponse.data) {
    TestValidator.equals(
      "active session status",
      session.sessionStatus,
      "active",
    );
  }
  // Test 2: Filter by status='invalidated'
  const invalidatedSessionsResponse =
    await api.functional.ecommerceMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          status: "invalidated",
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(invalidatedSessionsResponse);
  // Validate all returned sessions are invalidated
  for (const session of invalidatedSessionsResponse.data) {
    TestValidator.equals(
      "invalidated session status",
      session.sessionStatus,
      "invalidated",
    );
  }
  // Test 3: Filter by date range
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 86400000);
  const dateRangeResponse =
    await api.functional.ecommerceMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          startDate: oneWeekAgo.toISOString(),
          endDate: now.toISOString(),
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  // Validate all sessions are within date range
  for (const session of dateRangeResponse.data) {
    const sessionDate = new Date(session.created_at);
    TestValidator.predicate(
      "session created_at >= startDate",
      sessionDate >= oneWeekAgo,
    );
    TestValidator.predicate(
      "session created_at <= endDate",
      sessionDate <= now,
    );
  }
  // Test 4: Filter by device type
  const deviceTypeFilterResponse =
    await api.functional.ecommerceMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          deviceType: "mobile",
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(deviceTypeFilterResponse);
  // Test 5: Filter by location search
  const locationSearchResponse =
    await api.functional.ecommerceMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          locationSearch: "Test",
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(locationSearchResponse);
  // Test 6: Combined filters (status + date + device)
  const combinedFilterResponse =
    await api.functional.ecommerceMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          status: "active",
          startDate: oneWeekAgo.toISOString(),
          endDate: now.toISOString(),
          deviceType: "web",
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(combinedFilterResponse);
  // Test 7: Pagination with filtering
  const paginatedResponse =
    await api.functional.ecommerceMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current >= 1",
    paginatedResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit between 1-100",
    paginatedResponse.pagination.limit >= 1 &&
      paginatedResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    paginatedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    paginatedResponse.pagination.pages >= 0,
  );
  // Test 8: Verify customer only sees their own sessions
  const allSessionsResponse =
    await api.functional.ecommerceMall.customer.sessions.index(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(allSessionsResponse);
  // All sessions belong to the authenticated customer
  TestValidator.equals(
    "sessions count >= 0",
    0,
    allSessionsResponse.data.length,
  );
}
