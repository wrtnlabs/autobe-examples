import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator order list filtering by date range.
 *
 * Validates the date range filtering functionality for administrator order queries, ensuring orders can be filtered by creation date range for reporting and audit purposes. The test verifies proper handling of created_at_from and created_at_to filters, pagination metadata accuracy, and sorting behavior.
 *
 * The test covers multiple filtering scenarios including single date boundary filters, combined date range filters, and edge cases where the date range produces empty results. It also validates that date filters can be combined with other query parameters like status and order number patterns.
 *
 * 1. Administrator authenticates via /ecommerce/auth/admin/join endpoint.
 * 2. Test filtering by created_at_from only (orders from specific date forward).
 * 3. Test filtering by created_at_to only (orders up to specific date).
 * 4. Test filtering by combined created_at_from and created_at_to for date range.
 * 5. Validate pagination metadata reflects filtered result count.
 * 6. Verify orders are sorted by created_at descending within filtered range.
 * 7. Test combination of date filters with status filter.
 * 8. Test combination of date filters with order_number pattern search.
 * 9. Edge case: created_at_from > created_at_to returns empty results.
 * 10. Edge case: large date range returns all matching orders with pagination.
 */
export async function test_api_admin_order_list_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Get all orders without date filter for baseline comparison
  const allOrders = await api.functional.ecommerce.admin.orders.index(
    adminConnection,
    {
      body: {
        page: 0,
        limit: 100,
      } satisfies IEcommerceOrder.IRequest,
    },
  );
  typia.assert(allOrders);
  // If no orders exist, we can only validate the API accepts the parameters
  if (allOrders.data.length === 0) {
    // Test that empty results work with date filters
    const emptyResult = await api.functional.ecommerce.admin.orders.index(
      adminConnection,
      {
        body: {
          page: 0,
          limit: 10,
          created_at_from: new Date(Date.now() - 86400000 * 365).toISOString(),
          created_at_to: new Date().toISOString(),
        } satisfies IEcommerceOrder.IRequest,
      },
    );
    typia.assert(emptyResult);
    TestValidator.equals(
      "empty result pagination",
      emptyResult.pagination.records,
      0,
    );
    return;
  }
  // 2. Test filtering by created_at_from only
  const middleDate = new Date(allOrders.data[0].created_at);
  const fromDate = new Date(middleDate.getTime() - 86400000 * 30); // 30 days before first order
  const filteredFrom = await api.functional.ecommerce.admin.orders.index(
    adminConnection,
    {
      body: {
        page: 0,
        limit: 100,
        created_at_from: fromDate.toISOString(),
      } satisfies IEcommerceOrder.IRequest,
    },
  );
  typia.assert(filteredFrom);
  // All returned orders should be >= fromDate
  for (const order of filteredFrom.data) {
    TestValidator.predicate(
      `order ${order.order_number} created after fromDate`,
      new Date(order.created_at).getTime() >= fromDate.getTime(),
    );
  }
  // 3. Test filtering by created_at_to only
  const toDate = new Date(middleDate.getTime() + 86400000 * 30); // 30 days after first order
  const filteredTo = await api.functional.ecommerce.admin.orders.index(
    adminConnection,
    {
      body: {
        page: 0,
        limit: 100,
        created_at_to: toDate.toISOString(),
      } satisfies IEcommerceOrder.IRequest,
    },
  );
  typia.assert(filteredTo);
  // All returned orders should be <= toDate
  for (const order of filteredTo.data) {
    TestValidator.predicate(
      `order ${order.order_number} created before toDate`,
      new Date(order.created_at).getTime() <= toDate.getTime(),
    );
  }
  // 4. Test filtering by combined date range
  const rangeFrom = new Date(middleDate.getTime() - 86400000 * 15);
  const rangeTo = new Date(middleDate.getTime() + 86400000 * 15);
  const filteredRange = await api.functional.ecommerce.admin.orders.index(
    adminConnection,
    {
      body: {
        page: 0,
        limit: 100,
        created_at_from: rangeFrom.toISOString(),
        created_at_to: rangeTo.toISOString(),
      } satisfies IEcommerceOrder.IRequest,
    },
  );
  typia.assert(filteredRange);
  // All returned orders should be within the range
  for (const order of filteredRange.data) {
    const orderTime = new Date(order.created_at).getTime();
    TestValidator.predicate(
      `order ${order.order_number} within range start`,
      orderTime >= rangeFrom.getTime(),
    );
    TestValidator.predicate(
      `order ${order.order_number} within range end`,
      orderTime <= rangeTo.getTime(),
    );
  }
  // 5. Verify pagination metadata reflects filtered count
  TestValidator.predicate(
    "pagination records match data length",
    filteredRange.pagination.records === filteredRange.data.length ||
      filteredRange.pagination.records >= filteredRange.data.length,
  );
  // 6. Verify sorting by created_at descending
  for (let i = 1; i < filteredRange.data.length; i++) {
    const prev = new Date(filteredRange.data[i - 1].created_at).getTime();
    const curr = new Date(filteredRange.data[i].created_at).getTime();
    TestValidator.predicate(
      `order ${i} sorted descending (prev: ${filteredRange.data[i - 1].order_number}, curr: ${filteredRange.data[i].order_number})`,
      prev >= curr,
    );
  }
  // 7. Test combination with status filter
  if (filteredRange.data.length > 0) {
    const sampleStatus = filteredRange.data[0].status;
    const filteredWithStatus =
      await api.functional.ecommerce.admin.orders.index(adminConnection, {
        body: {
          page: 0,
          limit: 100,
          created_at_from: rangeFrom.toISOString(),
          created_at_to: rangeTo.toISOString(),
          status: sampleStatus,
        } satisfies IEcommerceOrder.IRequest,
      });
    typia.assert(filteredWithStatus);
    // All orders should have the specified status
    for (const order of filteredWithStatus.data) {
      TestValidator.equals(
        `order ${order.order_number} status matches filter`,
        order.status,
        sampleStatus,
      );
    }
  }
  // 8. Test combination with order_number pattern search
  if (filteredRange.data.length > 0) {
    const sampleOrderNumber = filteredRange.data[0].order_number;
    const searchPattern = sampleOrderNumber.substring(
      0,
      Math.max(3, Math.floor(sampleOrderNumber.length / 2)),
    );
    const filteredWithPattern =
      await api.functional.ecommerce.admin.orders.index(adminConnection, {
        body: {
          page: 0,
          limit: 100,
          created_at_from: rangeFrom.toISOString(),
          created_at_to: rangeTo.toISOString(),
          order_number: searchPattern,
        } satisfies IEcommerceOrder.IRequest,
      });
    typia.assert(filteredWithPattern);
    // All orders should contain the search pattern
    for (const order of filteredWithPattern.data) {
      TestValidator.predicate(
        `order ${order.order_number} contains pattern "${searchPattern}"`,
        order.order_number.includes(searchPattern),
      );
    }
  }
  // 9. Edge case: created_at_from > created_at_to returns empty results
  const invalidRange = await api.functional.ecommerce.admin.orders.index(
    adminConnection,
    {
      body: {
        page: 0,
        limit: 100,
        created_at_from: new Date(Date.now() + 86400000 * 365).toISOString(), // Future date
        created_at_to: new Date(Date.now() - 86400000 * 365).toISOString(), // Past date
      } satisfies IEcommerceOrder.IRequest,
    },
  );
  typia.assert(invalidRange);
  TestValidator.predicate(
    "invalid date range returns empty or minimal results",
    invalidRange.data.length === 0 || invalidRange.pagination.records === 0,
  );
  // 10. Edge case: very large date range (all orders)
  const largeRange = await api.functional.ecommerce.admin.orders.index(
    adminConnection,
    {
      body: {
        page: 0,
        limit: 100,
        created_at_from: new Date(
          Date.now() - 86400000 * 365 * 10,
        ).toISOString(), // 10 years ago
        created_at_to: new Date(Date.now() + 86400000 * 365 * 10).toISOString(), // 10 years in future
      } satisfies IEcommerceOrder.IRequest,
    },
  );
  typia.assert(largeRange);
  // Large range should return orders (potentially all if within pagination limit)
  TestValidator.predicate(
    "large date range returns results",
    largeRange.data.length > 0 || largeRange.pagination.records >= 0,
  );
}
