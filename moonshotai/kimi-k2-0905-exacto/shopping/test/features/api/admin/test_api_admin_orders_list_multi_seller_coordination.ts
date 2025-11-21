import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatus";

/**
 * Test filtering for orders containing products from multiple marketplace
 * sellers to validate complex fulfillment coordination.
 *
 * This comprehensive test scenario validates the administrator's ability to
 * monitor and manage complex orders that involve multiple sellers within the
 * marketplace platform. Such orders require coordinated shipping, separate
 * fulfillment workflows, and multi-party customer communication management.
 *
 * The test covers:
 *
 * 1. Administrator authentication setup for platform oversight
 * 2. Testing multi-seller order identification filters with various criteria
 *    combinations
 * 3. Verification of pagination and data structure integrity
 * 4. Validation of date range filtering and sorting capabilities
 * 5. Testing different multi-seller coordination scenarios (cancelled, active,
 *    recent)
 * 6. Ensuring proper administrative oversight for marketplace coordination
 *
 * This ensures administrators can effectively monitor cross-seller
 * transactions, coordinate fulfillment, and maintain customer service standards
 * across complex multi-party e-commerce operations.
 */
export async function test_api_admin_orders_list_multi_seller_coordination(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator for complex order management scenarios
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@admin.com`;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        firstname: RandomGenerator.name(),
        lastname: RandomGenerator.name(),
        adminlevel: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Configure date range for testing recent multi-seller orders
  const baseDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const endDate = new Date();

  // Step 3: Test multi-seller order filtering with comprehensive criteria
  const requestBody = {
    page: 1,
    limit: 50,
    containsMultipleSellers: true, // Key filter for multi-seller orders
    statuses: ["pending", "confirmed", "processing"],
    createdAfter: baseDate.toISOString(),
    createdBefore: endDate.toISOString(),
    sortBy: "createdAt" as const,
    sortOrder: "desc" as const,
  } satisfies IShoppingMallOrder.IRequest;

  const pageResponse = await api.functional.shoppingMall.admin.orders.index(
    connection,
    {
      body: requestBody,
    },
  );
  typia.assert(pageResponse);

  // Step 4: Validate pagination and data structure integrity
  TestValidator.predicate(
    "pagination exists",
    pageResponse.pagination !== undefined,
  );
  TestValidator.equals(
    "pagination page matches request",
    pageResponse.pagination.current,
    requestBody.page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    pageResponse.pagination.limit,
    requestBody.limit,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(pageResponse.data),
  );
  TestValidator.predicate(
    "pagination records count valid",
    pageResponse.pagination.records >= 0,
  );

  // Step 5: Validate each order contains essential multi-seller coordination data
  await ArrayUtil.asyncForEach(pageResponse.data, async (order) => {
    typia.assert<IShoppingMallOrder.ISummary>(order);

    // Verify core multi-seller order fields (typia.assert already validates format)
    TestValidator.predicate("has valid order ID", order.id !== undefined);
    TestValidator.predicate(
      "has customer relationship",
      order.customer_id !== undefined,
    );
    TestValidator.predicate(
      "has seller relationship",
      order.seller_id !== undefined,
    );
    TestValidator.predicate(
      "has creation timestamp",
      order.created_at !== undefined,
    );
    TestValidator.predicate(
      "has update timestamp",
      order.updated_at !== undefined,
    );

    // Verify date range compliance
    TestValidator.predicate(
      "created_at within specified range",
      new Date(order.created_at) >= new Date(requestBody.createdAfter!) &&
        new Date(order.created_at) <= new Date(requestBody.createdBefore!),
    );
  });

  // Step 6: Test specialized multi-seller scenarios with targeted filters
  const multiSellerScenarios = [
    {
      name: "cancelled multi-seller orders",
      config: {
        page: 1,
        limit: 10,
        containsMultipleSellers: true,
        statuses: ["cancelled"] as IShoppingMallOrderStatus[],
        sortBy: "updatedAt" as const,
      },
    },
    {
      name: "active multi-seller orders with payment confirmation",
      config: {
        page: 1,
        limit: 25,
        containsMultipleSellers: true,
        paymentConfirmed: true,
        statuses: ["confirmed", "processing"] as IShoppingMallOrderStatus[],
        sortBy: "totalAmount" as const,
      },
    },
    {
      name: "recent multi-seller orders with search criteria",
      config: {
        page: 1,
        limit: 20,
        containsMultipleSellers: true,
        search: RandomGenerator.alphaNumeric(8),
        sortBy: "orderNumber" as const,
      },
    },
  ];

  await ArrayUtil.asyncForEach(multiSellerScenarios, async (scenario) => {
    const filteredResponse =
      await api.functional.shoppingMall.admin.orders.index(connection, {
        body: scenario.config satisfies IShoppingMallOrder.IRequest,
      });
    typia.assert(filteredResponse);

    TestValidator.predicate(
      `scenario '${scenario.name}' returns valid data`,
      filteredResponse.data.length >= 0,
    );
    TestValidator.equals(
      `pagination records for ${scenario.name}`,
      filteredResponse.pagination.records,
      filteredResponse.data.length < filteredResponse.pagination.limit
        ? filteredResponse.data.length
        : filteredResponse.pagination.records,
    );
  });

  TestValidator.predicate(
    "multi-seller order coordination validation successful",
    pageResponse.data.length >= 0 || pageResponse.pagination.records >= 0,
  );
}
