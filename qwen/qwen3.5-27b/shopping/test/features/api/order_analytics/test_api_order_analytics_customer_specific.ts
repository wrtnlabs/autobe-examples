import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderAnalytic";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer-specific order analytics filtering.
 *
 * This test verifies that administrators can retrieve order analytics
 * filtered by a specific customer ID, ensuring proper data isolation
 * and accurate aggregation metrics for customer-specific reporting.
 */
export async function test_api_order_analytics_customer_specific(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin/login",
      referrer: "https://test.com",
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 2. Create a test customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://test.com/customer/join",
      referrer: "https://test.com",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 3. Test analytics with existing customer ID
  const analyticsRequest = {
    customerId: customer.id,
    page: 1,
    limit: 20,
  } satisfies IShoppingMallOrderAnalytic.IRequest;
  const analyticsResponse =
    await api.functional.shoppingMall.admin.analytics.orders.index(
      adminConnection,
      { body: analyticsRequest },
    );
  typia.assert(analyticsResponse);
  // 4. Verify pagination metadata
  TestValidator.equals(
    "pagination page matches request",
    analyticsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    analyticsResponse.pagination.limit,
    20,
  );
  // 5. Verify all returned orders belong to the filtered customer
  await ArrayUtil.asyncForEach(analyticsResponse.data, async (order) => {
    TestValidator.equals(
      `order ${order.id} belongs to filtered customer`,
      order.customer.id,
      customer.id,
    );
    TestValidator.equals(
      `customer email matches`,
      order.customer.email,
      customer.email,
    );
    TestValidator.predicate(
      `order has valid total_price`,
      order.total_price >= 0,
    );
    TestValidator.predicate(
      `order items count is non-negative`,
      order.order_items_count >= 0,
    );
    TestValidator.predicate(
      `cancellation count is non-negative`,
      order.cancellation_count >= 0,
    );
    TestValidator.predicate(
      `refund count is non-negative`,
      order.refund_count >= 0,
    );
    TestValidator.predicate(
      `shipment count is non-negative`,
      order.shipment_count >= 0,
    );
  });
  // 6. Test pagination with page 2
  const paginationRequest = {
    customerId: customer.id,
    page: 2,
    limit: 10,
  } satisfies IShoppingMallOrderAnalytic.IRequest;
  const paginatedResponse =
    await api.functional.shoppingMall.admin.analytics.orders.index(
      adminConnection,
      { body: paginationRequest },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination current page is 2",
    paginatedResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit is 10",
    paginatedResponse.pagination.limit,
    10,
  );
  // 7. Test with non-existent customer ID (should return empty results)
  const nonExistentCustomerId = typia.random<string & tags.Format<"uuid">>();
  const emptyRequest = {
    customerId: nonExistentCustomerId,
    page: 1,
    limit: 20,
  } satisfies IShoppingMallOrderAnalytic.IRequest;
  const emptyResponse =
    await api.functional.shoppingMall.admin.analytics.orders.index(
      adminConnection,
      { body: emptyRequest },
    );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "empty results for non-existent customer",
    emptyResponse.data.length,
    0,
  );
  TestValidator.equals(
    "total records is 0 for non-existent customer",
    emptyResponse.pagination.records,
    0,
  );
  // 8. Test with additional filters (date range)
  const now = new Date();
  const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const filteredRequest = {
    customerId: customer.id,
    startDate: pastDate.toISOString(),
    endDate: now.toISOString(),
    page: 1,
    limit: 50,
  } satisfies IShoppingMallOrderAnalytic.IRequest;
  const filteredResponse =
    await api.functional.shoppingMall.admin.analytics.orders.index(
      adminConnection,
      { body: filteredRequest },
    );
  typia.assert(filteredResponse);
  // Verify all orders in filtered response are within date range
  await ArrayUtil.asyncForEach(filteredResponse.data, async (order) => {
    const orderDate = new Date(order.created_at);
    TestValidator.predicate(
      `order ${order.id} is within date range (after startDate)`,
      orderDate >= pastDate,
    );
    TestValidator.predicate(
      `order ${order.id} is within date range (before endDate)`,
      orderDate <= now,
    );
  });
}
