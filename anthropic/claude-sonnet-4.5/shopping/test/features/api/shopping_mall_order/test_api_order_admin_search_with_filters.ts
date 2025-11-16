import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";

/**
 * Test the admin order search functionality with comprehensive filtering
 * capabilities.
 *
 * This test validates that administrators can successfully search and filter
 * orders using various criteria including order status, date ranges, amount
 * filters, payment status, search terms, and sorting options. The test ensures
 * proper pagination support and validates that filters can be applied
 * individually and in combination.
 *
 * Test Flow:
 *
 * 1. Create an admin account and authenticate
 * 2. Test basic pagination with default settings
 * 3. Test status filtering
 * 4. Test date range filtering
 * 5. Test amount range filtering
 * 6. Test payment status filtering
 * 7. Test search term functionality
 * 8. Test sorting options (ascending and descending)
 * 9. Test combined filters
 * 10. Validate response structure and pagination metadata
 */
export async function test_api_order_admin_search_with_filters(
  connection: api.IConnection,
) {
  // Step 1: Create admin account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "Admin@123!",
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Test basic pagination with empty filters (default behavior)
  const defaultPage = await api.functional.shoppingMall.admin.orders.index(
    connection,
    {
      body: {} satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(defaultPage);
  TestValidator.predicate(
    "pagination metadata exists",
    defaultPage.pagination !== null && defaultPage.pagination !== undefined,
  );
  TestValidator.predicate("data array exists", Array.isArray(defaultPage.data));
  TestValidator.predicate(
    "pagination current page is valid",
    defaultPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    defaultPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    defaultPage.pagination.pages >= 0,
  );

  // Step 3: Test status filter - filter by specific order status
  const statusFilterPage = await api.functional.shoppingMall.admin.orders.index(
    connection,
    {
      body: {
        status: "payment_confirmed",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(statusFilterPage);
  if (statusFilterPage.data.length > 0) {
    TestValidator.predicate(
      "all orders have payment_confirmed status",
      statusFilterPage.data.every(
        (order) => order.status === "payment_confirmed",
      ),
    );
  }

  // Step 4: Test date range filtering
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateFilterPage = await api.functional.shoppingMall.admin.orders.index(
    connection,
    {
      body: {
        from_date: thirtyDaysAgo.toISOString(),
        to_date: now.toISOString(),
        page: 1,
        limit: 20,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(dateFilterPage);
  if (dateFilterPage.data.length > 0) {
    TestValidator.predicate(
      "all orders are within date range",
      dateFilterPage.data.every((order) => {
        const createdAt = new Date(order.created_at);
        return createdAt >= thirtyDaysAgo && createdAt <= now;
      }),
    );
  }

  // Step 5: Test amount range filtering
  const amountFilterPage = await api.functional.shoppingMall.admin.orders.index(
    connection,
    {
      body: {
        min_amount: 100,
        max_amount: 5000,
        page: 1,
        limit: 15,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(amountFilterPage);
  if (amountFilterPage.data.length > 0) {
    TestValidator.predicate(
      "all orders are within amount range",
      amountFilterPage.data.every(
        (order) => order.total_amount >= 100 && order.total_amount <= 5000,
      ),
    );
  }

  // Step 6: Test payment status filtering
  const paymentStatusPage =
    await api.functional.shoppingMall.admin.orders.index(connection, {
      body: {
        payment_status: "completed",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(paymentStatusPage);

  // Step 7: Test search term functionality
  const searchPage = await api.functional.shoppingMall.admin.orders.index(
    connection,
    {
      body: {
        search: "ORD",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(searchPage);

  // Step 8: Test sorting - sort by created_at ascending
  const sortAscPage = await api.functional.shoppingMall.admin.orders.index(
    connection,
    {
      body: {
        sort_by: "created_at",
        sort_order: "asc",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(sortAscPage);
  if (sortAscPage.data.length > 1) {
    TestValidator.predicate(
      "orders are sorted by created_at ascending",
      sortAscPage.data.every((order, index) => {
        if (index === 0) return true;
        return (
          new Date(sortAscPage.data[index - 1].created_at) <=
          new Date(order.created_at)
        );
      }),
    );
  }

  // Step 9: Test sorting - sort by total_amount descending
  const sortDescPage = await api.functional.shoppingMall.admin.orders.index(
    connection,
    {
      body: {
        sort_by: "total_amount",
        sort_order: "desc",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(sortDescPage);
  if (sortDescPage.data.length > 1) {
    TestValidator.predicate(
      "orders are sorted by total_amount descending",
      sortDescPage.data.every((order, index) => {
        if (index === 0) return true;
        return sortDescPage.data[index - 1].total_amount >= order.total_amount;
      }),
    );
  }

  // Step 10: Test combined filters - multiple criteria at once
  const combinedFilterPage =
    await api.functional.shoppingMall.admin.orders.index(connection, {
      body: {
        status: "delivered",
        min_amount: 50,
        max_amount: 10000,
        from_date: thirtyDaysAgo.toISOString(),
        to_date: now.toISOString(),
        payment_status: "completed",
        sort_by: "created_at",
        sort_order: "desc",
        page: 1,
        limit: 25,
      } satisfies IShoppingMallOrder.IRequest,
    });
  typia.assert(combinedFilterPage);
  if (combinedFilterPage.data.length > 0) {
    TestValidator.predicate(
      "combined filters: all orders match status criteria",
      combinedFilterPage.data.every((order) => order.status === "delivered"),
    );
    TestValidator.predicate(
      "combined filters: all orders match amount range",
      combinedFilterPage.data.every(
        (order) => order.total_amount >= 50 && order.total_amount <= 10000,
      ),
    );
    TestValidator.predicate(
      "combined filters: all orders match date range",
      combinedFilterPage.data.every((order) => {
        const createdAt = new Date(order.created_at);
        return createdAt >= thirtyDaysAgo && createdAt <= now;
      }),
    );
  }

  // Step 11: Validate response structure contains all required order summary fields
  if (defaultPage.data.length > 0) {
    const sampleOrder = defaultPage.data[0];
    TestValidator.predicate(
      "order has id field",
      sampleOrder.id !== null && sampleOrder.id !== undefined,
    );
    TestValidator.predicate(
      "order has order_number field",
      sampleOrder.order_number !== null &&
        sampleOrder.order_number !== undefined,
    );
    TestValidator.predicate(
      "order has status field",
      sampleOrder.status !== null && sampleOrder.status !== undefined,
    );
    TestValidator.predicate(
      "order has subtotal field",
      typeof sampleOrder.subtotal === "number",
    );
    TestValidator.predicate(
      "order has shipping_total field",
      typeof sampleOrder.shipping_total === "number",
    );
    TestValidator.predicate(
      "order has tax_total field",
      typeof sampleOrder.tax_total === "number",
    );
    TestValidator.predicate(
      "order has discount_total field",
      typeof sampleOrder.discount_total === "number",
    );
    TestValidator.predicate(
      "order has total_amount field",
      typeof sampleOrder.total_amount === "number",
    );
    TestValidator.predicate(
      "order has created_at field",
      sampleOrder.created_at !== null && sampleOrder.created_at !== undefined,
    );
    TestValidator.predicate(
      "order has updated_at field",
      sampleOrder.updated_at !== null && sampleOrder.updated_at !== undefined,
    );
  }

  // Step 12: Test pagination - retrieve multiple pages
  const page1 = await api.functional.shoppingMall.admin.orders.index(
    connection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals(
    "page 1 current page number",
    page1.pagination.current,
    1,
  );

  if (page1.pagination.pages > 1) {
    const page2 = await api.functional.shoppingMall.admin.orders.index(
      connection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
    typia.assert(page2);
    TestValidator.equals(
      "page 2 current page number",
      page2.pagination.current,
      2,
    );
    TestValidator.predicate(
      "different pages return different data",
      page1.data.length === 0 ||
        page2.data.length === 0 ||
        page1.data[0].id !== page2.data[0].id,
    );
  }
}
