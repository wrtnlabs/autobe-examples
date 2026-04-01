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
 * Test customer session status filtering functionality.
 *
 * This test verifies that customers can filter their session history by status
 * (active or expired). After customer registration and login, the test retrieves
 * sessions with status filter set to 'active' and verifies only sessions where
 * expired_at is in the future are returned. Then retrieves sessions with status
 * filter set to 'expired' and validates the filtering behavior. The test also
 * validates that the is_active field in response matches the filter criteria
 * and verifies pagination metadata is correct.
 *
 * @param connection Base connection for the test
 */
export async function test_api_customer_session_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account with known password for login
  const testPassword = RandomGenerator.alphaNumeric(16);
  const customerJoinResult = await authorize_customer_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: testPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoinResult);
  // 2. Create customer connection and login to establish active session
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerJoinResult.email,
      password: testPassword,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 3. Retrieve sessions with status='active' filter
  const activeSessionsResponse =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          status: "active",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(activeSessionsResponse);
  // 4. Validate active sessions pagination metadata
  TestValidator.predicate(
    "active pagination current page is positive",
    activeSessionsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "active pagination limit is positive",
    activeSessionsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "active pagination records is non-negative",
    activeSessionsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "active pagination pages is non-negative",
    activeSessionsResponse.pagination.pages >= 0,
  );
  // 5. Validate all returned active sessions have correct status
  for (const session of activeSessionsResponse.data) {
    TestValidator.predicate(
      "active session is_active flag is true",
      session.is_active === true,
    );
    TestValidator.predicate(
      "active session expired_at is in future",
      new Date(session.expired_at).getTime() > Date.now(),
    );
  }
  // 6. Retrieve sessions with status='expired' filter
  const expiredSessionsResponse =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          status: "expired",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(expiredSessionsResponse);
  // 7. Validate expired sessions pagination metadata
  TestValidator.predicate(
    "expired pagination current page is positive",
    expiredSessionsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "expired pagination limit is positive",
    expiredSessionsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "expired pagination records is non-negative",
    expiredSessionsResponse.pagination.records >= 0,
  );
  // 8. Validate all returned expired sessions have correct status (if any exist)
  for (const session of expiredSessionsResponse.data) {
    TestValidator.predicate(
      "expired session is_active flag is false",
      session.is_active === false,
    );
    TestValidator.predicate(
      "expired session expired_at is in past or now",
      new Date(session.expired_at).getTime() <= Date.now(),
    );
  }
  // 9. Test edge case: empty expired results with correct pagination for new customer
  if (expiredSessionsResponse.data.length === 0) {
    TestValidator.equals(
      "expired sessions records count when empty",
      expiredSessionsResponse.pagination.records,
      0,
    );
    TestValidator.equals(
      "expired pagination pages when no records",
      expiredSessionsResponse.pagination.pages,
      0,
    );
  }
  // 10. Validate one-session-per-user constraint for active sessions
  // Typically only one active session should exist at a time for a customer
  if (activeSessionsResponse.data.length > 0) {
    TestValidator.predicate(
      "active sessions count within reasonable limit",
      activeSessionsResponse.data.length <= 5,
    );
  }
  // 11. Test unfiltered session retrieval to verify filter consistency
  const allSessionsResponse =
    await api.functional.shoppingMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(allSessionsResponse);
  // 12. Validate total sessions equals sum of active and expired filtered results
  const totalFromFilters =
    activeSessionsResponse.pagination.records +
    expiredSessionsResponse.pagination.records;
  TestValidator.equals(
    "total sessions matches sum of active and expired filters",
    allSessionsResponse.pagination.records,
    totalFromFilters,
  );
}
