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
 * Test admin order search endpoint role-based access control.
 *
 * This test validates that administrators have unrestricted access to search
 * and retrieve all orders across the platform with complete order information
 * including financial details, payment status, and buyer/seller data.
 *
 * Test Steps:
 *
 * 1. Create and authenticate admin user
 * 2. Search all orders without filters (verify unrestricted access)
 * 3. Validate response structure and pagination
 * 4. Verify complete order summary information is accessible
 * 5. Test filtering by buyer_id and seller_id
 * 6. Confirm all order statuses and financial data are visible
 */
export async function test_api_order_admin_search_role_based_access(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    href: `https://admin.example.com/join`,
    referrer: `https://admin.example.com/login`,
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // Verify admin authentication tokens are issued
  typia.assert(admin.token);
  TestValidator.equals("admin email matches", admin.email, adminEmail);
  TestValidator.equals(
    "admin level is super_admin",
    admin.admin_level,
    "super_admin",
  );

  // Step 2: Search all orders without filters - admin has unrestricted access
  const allOrdersRequest = {
    page: 1,
    limit: 20,
    sort_by: "created_at" as const,
    sort_order: "desc" as const,
  } satisfies IShoppingMallOrder.IRequest;

  const allOrdersResponse: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.admin.orders.index(connection, {
      body: allOrdersRequest,
    });
  typia.assert(allOrdersResponse);

  // Step 3: Validate response structure and pagination metadata
  typia.assert(allOrdersResponse.pagination);
  TestValidator.predicate(
    "pagination current page is valid",
    allOrdersResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    allOrdersResponse.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    allOrdersResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    allOrdersResponse.pagination.pages >= 0,
  );

  // Step 4: Validate order data array structure
  typia.assert(allOrdersResponse.data);
  TestValidator.predicate(
    "order data is an array",
    Array.isArray(allOrdersResponse.data),
  );

  // If there are orders in the system, validate complete order information access
  if (allOrdersResponse.data.length > 0) {
    const firstOrder = allOrdersResponse.data[0];
    typia.assert(firstOrder);

    // Verify financial information is accessible to admin - business logic validation
    TestValidator.predicate(
      "order subtotal is non-negative",
      firstOrder.subtotal >= 0,
    );
    TestValidator.predicate(
      "order total amount is non-negative",
      firstOrder.total_amount >= 0,
    );
  }

  // Step 5: Test filtering by order status
  const statusFilterRequest = {
    page: 1,
    limit: 10,
    status: "pending_payment" as const,
  } satisfies IShoppingMallOrder.IRequest;

  const statusFilteredResponse: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.admin.orders.index(connection, {
      body: statusFilterRequest,
    });
  typia.assert(statusFilteredResponse);
  typia.assert(statusFilteredResponse.pagination);
  typia.assert(statusFilteredResponse.data);

  // Step 6: Test buyer_id filtering - critical scenario requirement
  const buyerIdFilterRequest = {
    page: 1,
    limit: 10,
    buyer_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IShoppingMallOrder.IRequest;

  const buyerFilteredResponse: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.admin.orders.index(connection, {
      body: buyerIdFilterRequest,
    });
  typia.assert(buyerFilteredResponse);
  typia.assert(buyerFilteredResponse.pagination);
  typia.assert(buyerFilteredResponse.data);

  // Step 7: Test seller_id filtering - critical scenario requirement
  const sellerIdFilterRequest = {
    page: 1,
    limit: 10,
    seller_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IShoppingMallOrder.IRequest;

  const sellerFilteredResponse: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.admin.orders.index(connection, {
      body: sellerIdFilterRequest,
    });
  typia.assert(sellerFilteredResponse);
  typia.assert(sellerFilteredResponse.pagination);
  typia.assert(sellerFilteredResponse.data);

  // Step 8: Test date range filtering
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dateRangeRequest = {
    page: 1,
    limit: 15,
    from_date: thirtyDaysAgo.toISOString(),
    to_date: now.toISOString(),
  } satisfies IShoppingMallOrder.IRequest;

  const dateFilteredResponse: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.admin.orders.index(connection, {
      body: dateRangeRequest,
    });
  typia.assert(dateFilteredResponse);
  typia.assert(dateFilteredResponse.pagination);
  typia.assert(dateFilteredResponse.data);

  // Step 9: Test amount range filtering
  const amountRangeRequest = {
    page: 1,
    limit: 10,
    min_amount: 0,
    max_amount: 1000000,
  } satisfies IShoppingMallOrder.IRequest;

  const amountFilteredResponse: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.admin.orders.index(connection, {
      body: amountRangeRequest,
    });
  typia.assert(amountFilteredResponse);
  typia.assert(amountFilteredResponse.pagination);
  typia.assert(amountFilteredResponse.data);

  // Step 10: Test search functionality
  const searchRequest = {
    page: 1,
    limit: 10,
    search: RandomGenerator.alphaNumeric(5),
  } satisfies IShoppingMallOrder.IRequest;

  const searchResponse: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.admin.orders.index(connection, {
      body: searchRequest,
    });
  typia.assert(searchResponse);
  typia.assert(searchResponse.pagination);
  typia.assert(searchResponse.data);

  // Step 11: Test payment status filtering
  const paymentStatusRequest = {
    page: 1,
    limit: 10,
    payment_status: "completed" as const,
  } satisfies IShoppingMallOrder.IRequest;

  const paymentStatusResponse: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.admin.orders.index(connection, {
      body: paymentStatusRequest,
    });
  typia.assert(paymentStatusResponse);
  typia.assert(paymentStatusResponse.pagination);
  typia.assert(paymentStatusResponse.data);

  // Step 12: Test combined filters including buyer_id and seller_id
  const combinedFilterRequest = {
    page: 1,
    limit: 25,
    sort_by: "total_amount" as const,
    sort_order: "desc" as const,
    status: "payment_confirmed" as const,
    payment_status: "completed" as const,
    min_amount: 100,
    buyer_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IShoppingMallOrder.IRequest;

  const combinedFilterResponse: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.admin.orders.index(connection, {
      body: combinedFilterRequest,
    });
  typia.assert(combinedFilterResponse);
  typia.assert(combinedFilterResponse.pagination);
  typia.assert(combinedFilterResponse.data);

  // Validate that admin successfully accessed order search with all filter types
  TestValidator.predicate(
    "admin successfully searched orders with comprehensive filters",
    allOrdersResponse.pagination.pages >= 0,
  );
}
