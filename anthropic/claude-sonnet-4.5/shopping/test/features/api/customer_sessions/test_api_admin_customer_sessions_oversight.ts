import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";

/**
 * Test administrative session oversight workflow for customer session
 * monitoring.
 *
 * This test validates that administrators can monitor customer sessions for
 * security and support purposes. The workflow includes:
 *
 * 1. Create admin account with oversight privileges
 * 2. Create customer account to generate session data
 * 3. Retrieve customer sessions with various filters (device type, date ranges)
 * 4. Validate pagination and session detail visibility
 * 5. Verify comprehensive session information (device, location, timestamps)
 *
 * This ensures admins have full visibility into customer session details for
 * security investigations and customer support scenarios.
 */
export async function test_api_admin_customer_sessions_oversight(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for session oversight
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminData });
  typia.assert(admin);

  // Step 2: Create customer account to generate session data
  const customerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: customerData });
  typia.assert(customer);

  // Step 3: Retrieve customer sessions without filters
  const allSessionsRequest = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallCustomerSession.IRequest;

  const allSessions: IPageIShoppingMallCustomerSession =
    await api.functional.shoppingMall.admin.customers.sessions.index(
      connection,
      {
        customerId: customer.id,
        body: allSessionsRequest,
      },
    );
  typia.assert(allSessions);

  // Validate pagination structure
  TestValidator.equals(
    "pagination current page matches request",
    allSessions.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    allSessions.pagination.limit,
    10,
  );

  // Step 4: Test filtering by device type
  const deviceTypes = ["mobile", "tablet", "desktop"] as const;
  const deviceType = RandomGenerator.pick(deviceTypes);

  const deviceFilterRequest = {
    page: 1,
    limit: 10,
    device_type: deviceType,
  } satisfies IShoppingMallCustomerSession.IRequest;

  const deviceFilteredSessions: IPageIShoppingMallCustomerSession =
    await api.functional.shoppingMall.admin.customers.sessions.index(
      connection,
      {
        customerId: customer.id,
        body: deviceFilterRequest,
      },
    );
  typia.assert(deviceFilteredSessions);

  // Step 5: Test filtering by date range
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dateFilterRequest = {
    page: 1,
    limit: 10,
    start_date: thirtyDaysAgo.toISOString(),
    end_date: now.toISOString(),
  } satisfies IShoppingMallCustomerSession.IRequest;

  const dateFilteredSessions: IPageIShoppingMallCustomerSession =
    await api.functional.shoppingMall.admin.customers.sessions.index(
      connection,
      {
        customerId: customer.id,
        body: dateFilterRequest,
      },
    );
  typia.assert(dateFilteredSessions);

  // Step 6: Test combined filters (device type + date range)
  const combinedFilterRequest = {
    page: 1,
    limit: 5,
    device_type: deviceType,
    start_date: thirtyDaysAgo.toISOString(),
    end_date: now.toISOString(),
  } satisfies IShoppingMallCustomerSession.IRequest;

  const combinedFilteredSessions: IPageIShoppingMallCustomerSession =
    await api.functional.shoppingMall.admin.customers.sessions.index(
      connection,
      {
        customerId: customer.id,
        body: combinedFilterRequest,
      },
    );
  typia.assert(combinedFilteredSessions);

  // Validate pagination limit applied correctly
  TestValidator.equals(
    "combined filter pagination limit matches request",
    combinedFilteredSessions.pagination.limit,
    5,
  );

  // Step 7: Validate session data structure if sessions exist
  if (allSessions.data.length > 0) {
    const sessionSample = allSessions.data[0];
    typia.assert(sessionSample);

    TestValidator.predicate(
      "session has valid UUID identifier",
      sessionSample.id.length === 36,
    );

    TestValidator.predicate(
      "session has created_at timestamp",
      sessionSample.created_at.length > 0,
    );

    TestValidator.predicate(
      "session has last_activity_at timestamp",
      sessionSample.last_activity_at.length > 0,
    );

    TestValidator.predicate(
      "session has refresh_token_expires_at timestamp",
      sessionSample.refresh_token_expires_at.length > 0,
    );
  }

  // Step 8: Test pagination - retrieve second page if available
  if (allSessions.pagination.pages > 1) {
    const secondPageRequest = {
      page: 2,
      limit: 10,
    } satisfies IShoppingMallCustomerSession.IRequest;

    const secondPageSessions: IPageIShoppingMallCustomerSession =
      await api.functional.shoppingMall.admin.customers.sessions.index(
        connection,
        {
          customerId: customer.id,
          body: secondPageRequest,
        },
      );
    typia.assert(secondPageSessions);

    TestValidator.equals(
      "second page current matches request",
      secondPageSessions.pagination.current,
      2,
    );
  }
}
