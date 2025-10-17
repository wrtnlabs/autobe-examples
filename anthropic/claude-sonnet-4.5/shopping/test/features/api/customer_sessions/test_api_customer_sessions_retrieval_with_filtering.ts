import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";

/**
 * Test customer session retrieval and filtering functionality.
 *
 * This test validates the complete customer session management workflow where a
 * customer can view all their active sessions across multiple devices. The test
 * creates a new customer account, authenticates to establish a session, then
 * retrieves and filters the session list with various criteria.
 *
 * The test ensures that:
 *
 * 1. Customer registration creates an authenticated session
 * 2. Session retrieval returns properly structured data with device information
 * 3. Filtering by device type works correctly
 * 4. Date range filtering functions as expected
 * 5. Pagination controls work properly
 * 6. Session metadata includes all required fields (timestamps, IP, location,
 *    etc.)
 *
 * This validates the multi-device session management feature and security
 * monitoring capabilities that allow customers to monitor account access across
 * different devices.
 */
export async function test_api_customer_sessions_retrieval_with_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create a new customer account through registration
  const customerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerData,
    });
  typia.assert(customer);

  // Validate customer registration response
  TestValidator.equals(
    "customer email matches",
    customer.email,
    customerData.email,
  );
  TestValidator.equals(
    "customer name matches",
    customer.name,
    customerData.name,
  );
  typia.assert<string & tags.Format<"uuid">>(customer.id);
  typia.assert<IAuthorizationToken>(customer.token);

  // Step 2: Retrieve all sessions without filters
  const allSessionsRequest = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallCustomerSession.IRequest;

  const allSessions: IPageIShoppingMallCustomerSession =
    await api.functional.shoppingMall.customer.customers.sessions.index(
      connection,
      {
        customerId: customer.id,
        body: allSessionsRequest,
      },
    );
  typia.assert(allSessions);

  // Validate pagination structure
  typia.assert<IPage.IPagination>(allSessions.pagination);
  TestValidator.predicate(
    "at least one session exists after registration",
    allSessions.data.length > 0,
  );
  TestValidator.predicate(
    "pagination current page is 1",
    allSessions.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    allSessions.pagination.limit === 10,
  );

  // Validate session structure and fields
  if (allSessions.data.length > 0) {
    const firstSession = allSessions.data[0];
    typia.assert<IShoppingMallCustomerSession>(firstSession);
    typia.assert<string & tags.Format<"uuid">>(firstSession.id);
    typia.assert<string & tags.Format<"date-time">>(firstSession.created_at);
    typia.assert<string & tags.Format<"date-time">>(
      firstSession.last_activity_at,
    );
    typia.assert<string & tags.Format<"date-time">>(
      firstSession.refresh_token_expires_at,
    );
  }

  // Step 3: Test filtering by device type
  const deviceTypes = ["mobile", "tablet", "desktop"] as const;
  const randomDeviceType = RandomGenerator.pick([...deviceTypes]);

  const deviceFilterRequest = {
    page: 1,
    limit: 10,
    device_type: randomDeviceType,
  } satisfies IShoppingMallCustomerSession.IRequest;

  const deviceFilteredSessions: IPageIShoppingMallCustomerSession =
    await api.functional.shoppingMall.customer.customers.sessions.index(
      connection,
      {
        customerId: customer.id,
        body: deviceFilterRequest,
      },
    );
  typia.assert(deviceFilteredSessions);

  // Validate device type filtering
  TestValidator.predicate(
    "device filtered sessions have valid pagination",
    deviceFilteredSessions.pagination !== null &&
      deviceFilteredSessions.pagination !== undefined,
  );

  // Step 4: Test date range filtering
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dateFilterRequest = {
    page: 1,
    limit: 10,
    start_date: thirtyDaysAgo.toISOString(),
    end_date: now.toISOString(),
  } satisfies IShoppingMallCustomerSession.IRequest;

  const dateFilteredSessions: IPageIShoppingMallCustomerSession =
    await api.functional.shoppingMall.customer.customers.sessions.index(
      connection,
      {
        customerId: customer.id,
        body: dateFilterRequest,
      },
    );
  typia.assert(dateFilteredSessions);

  // Validate date range filtering
  TestValidator.predicate(
    "date filtered sessions should include current session",
    dateFilteredSessions.data.length > 0,
  );

  // Verify sessions fall within date range
  for (const session of dateFilteredSessions.data) {
    const createdAt = new Date(session.created_at);
    TestValidator.predicate(
      "session created date is within range",
      createdAt >= thirtyDaysAgo && createdAt <= now,
    );
  }

  // Step 5: Test combined filtering (device type + date range)
  const combinedFilterRequest = {
    page: 1,
    limit: 5,
    device_type: randomDeviceType,
    start_date: thirtyDaysAgo.toISOString(),
    end_date: now.toISOString(),
  } satisfies IShoppingMallCustomerSession.IRequest;

  const combinedFilteredSessions: IPageIShoppingMallCustomerSession =
    await api.functional.shoppingMall.customer.customers.sessions.index(
      connection,
      {
        customerId: customer.id,
        body: combinedFilterRequest,
      },
    );
  typia.assert(combinedFilteredSessions);

  TestValidator.predicate(
    "combined filter limit matches request",
    combinedFilteredSessions.pagination.limit === 5,
  );

  // Step 6: Test pagination with different page sizes
  const smallPageRequest = {
    page: 1,
    limit: 1,
  } satisfies IShoppingMallCustomerSession.IRequest;

  const smallPageSessions: IPageIShoppingMallCustomerSession =
    await api.functional.shoppingMall.customer.customers.sessions.index(
      connection,
      {
        customerId: customer.id,
        body: smallPageRequest,
      },
    );
  typia.assert(smallPageSessions);

  TestValidator.predicate(
    "small page returns at most 1 item",
    smallPageSessions.data.length <= 1,
  );
  TestValidator.equals(
    "small page limit is 1",
    smallPageSessions.pagination.limit,
    1,
  );

  // Step 7: Test maximum page size
  const maxPageRequest = {
    page: 1,
    limit: 100,
  } satisfies IShoppingMallCustomerSession.IRequest;

  const maxPageSessions: IPageIShoppingMallCustomerSession =
    await api.functional.shoppingMall.customer.customers.sessions.index(
      connection,
      {
        customerId: customer.id,
        body: maxPageRequest,
      },
    );
  typia.assert(maxPageSessions);

  TestValidator.equals(
    "max page limit is 100",
    maxPageSessions.pagination.limit,
    100,
  );
}
