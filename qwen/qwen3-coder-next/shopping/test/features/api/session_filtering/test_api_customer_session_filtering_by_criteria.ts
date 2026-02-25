import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
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

export async function test_api_customer_session_filtering_by_criteria(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection and join
  const customerConnection: api.IConnection = { host: connection.host };
  const customerData = {
    email: typia.assert<string & (tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">)>(
      typia.random<string & tags.Format<"email">>()
    ),
    password: "12345678",
    href: "https://example.com/register",
    referrer: "https://example.com/referrer",
  } satisfies IShoppingMallCustomer.IJoin;
  const authorizedCustomer = await authorize_customer_join(customerConnection, {
    body: customerData,
  });
  typia.assert(authorizedCustomer);
  // Get initial session information
  const initialSessions =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(initialSessions);
  // Record IP address and timestamp from the initial session
  if (initialSessions.data.length === 0) {
    throw new Error("No initial session found after registration");
  }
  const initialSession = initialSessions.data[0];
  const customerIP = initialSession.ip;
  const sessionCreatedAt = initialSession.created_at;
  // Test 1: Filter by IP address
  const ipFilteredSessions =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          ip: customerIP,
        },
      },
    );
  typia.assert(ipFilteredSessions);
  // Verify all sessions match the IP address
  for (const session of ipFilteredSessions.data) {
    TestValidator.equals("session IP matches filter", session.ip, customerIP);
  }
  // Verify that the number of sessions is at least 1 (the initial session)
  TestValidator.predicate(
    "at least one session found",
    ipFilteredSessions.data.length >= 1,
  );
  // Test 2: Filter by date range
  const oneHourEarlier = new Date(
    new Date(sessionCreatedAt).getTime() - 60 * 60 * 1000,
  ).toISOString();
  const oneHourLater = new Date(
    new Date(sessionCreatedAt).getTime() + 60 * 60 * 1000,
  ).toISOString();
  const dateFilteredSessions =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          created_at_min: oneHourEarlier,
          created_at_max: oneHourLater,
        },
      },
    );
  typia.assert(dateFilteredSessions);
  // Verify all sessions are within the date range
  for (const session of dateFilteredSessions.data) {
    TestValidator.predicate(
      "session created_at >= min",
      new Date(session.created_at) >= new Date(oneHourEarlier),
    );
    TestValidator.predicate(
      "session created_at <= max",
      new Date(session.created_at) <= new Date(oneHourLater),
    );
  }
  // Test 3: Verify pagination works correctly with filtered results
  const paginatedSessions =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 2,
          ip: customerIP,
        },
      },
    );
  typia.assert(paginatedSessions);
  // Verify pagination structure
  TestValidator.equals(
    "pagination page is 1",
    paginatedSessions.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 2",
    paginatedSessions.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "pagination records >= data length",
    paginatedSessions.pagination.records >= paginatedSessions.data.length,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    paginatedSessions.pagination.pages >= 1,
  );
  // Verify that we got at most 2 sessions (the limit)
  TestValidator.predicate(
    "limited to 2 sessions",
    paginatedSessions.data.length <= 2,
  );
}