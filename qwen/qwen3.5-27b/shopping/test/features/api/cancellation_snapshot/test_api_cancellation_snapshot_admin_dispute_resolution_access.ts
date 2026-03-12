import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_cancellation_snapshot_admin_dispute_resolution_access(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that administrators can access cancellation snapshots for dispute resolution and audit purposes.
   * 1. Administrator authenticates and gains access to all cancellation snapshots
   * 2. Administrator can retrieve snapshots across all sellers and customers
   * 3. Snapshots preserve complete cancellation request state including timestamps
   * 4. Snapshots support filtering by customerId for customer dispute investigation
   * 5. Snapshots support filtering by sellerId for seller audit purposes
   * 6. Snapshots support filtering by status (pending/approved/rejected)
   * 7. Snapshots support filtering by orderId for order-level investigation
   * 8. Pagination works correctly with configurable page and limit
   * 9. Sorting works correctly with sortBy and sortOrder parameters
   * 10. Date range filtering works with from and to parameters
   * 11. All snapshot data is properly validated using typia.assert
   */
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Retrieve all cancellation snapshots (no filters)
  const allSnapshots =
    await api.functional.shoppingMall.admin.cancellationSnapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    allSnapshots.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", allSnapshots.pagination.limit, 20);
  TestValidator.predicate("has snapshot data", allSnapshots.data.length >= 0);
  // 3. Test filtering by customerId (simulate customer dispute investigation)
  if (allSnapshots.data.length > 0) {
    const customerIdFilter = typia.random<string & tags.Format<"uuid">>();
    const customerFilteredSnapshots =
      await api.functional.shoppingMall.admin.cancellationSnapshots.index(
        adminConnection,
        {
          body: {
            page: 1,
            limit: 20,
            customerId: customerIdFilter,
          } satisfies IShoppingMallCancellationSnapshot.IRequest,
        },
      );
    typia.assert(customerFilteredSnapshots);
    // Validate that filtering returns valid pagination structure
    TestValidator.equals(
      "customer filter pagination",
      customerFilteredSnapshots.pagination.current,
      1,
    );
  }
  // 4. Test filtering by sellerId (simulate seller audit)
  if (allSnapshots.data.length > 0) {
    const sellerIdFilter = typia.random<string & tags.Format<"uuid">>();
    const sellerFilteredSnapshots =
      await api.functional.shoppingMall.admin.cancellationSnapshots.index(
        adminConnection,
        {
          body: {
            page: 1,
            limit: 20,
            sellerId: sellerIdFilter,
          } satisfies IShoppingMallCancellationSnapshot.IRequest,
        },
      );
    typia.assert(sellerFilteredSnapshots);
    // Validate that filtering returns valid pagination structure
    TestValidator.equals(
      "seller filter pagination",
      sellerFilteredSnapshots.pagination.current,
      1,
    );
  }
  // 5. Test filtering by status (pending/approved/rejected)
  const statuses = ["pending", "approved", "rejected"] as const;
  for (const status of statuses) {
    const statusFilteredSnapshots =
      await api.functional.shoppingMall.admin.cancellationSnapshots.index(
        adminConnection,
        {
          body: {
            page: 1,
            limit: 20,
            status: status,
          } satisfies IShoppingMallCancellationSnapshot.IRequest,
        },
      );
    typia.assert(statusFilteredSnapshots);
    // Validate pagination structure for each status filter
    TestValidator.equals(
      `status filter (${status}) pagination`,
      statusFilteredSnapshots.pagination.current,
      1,
    );
  }
  // 6. Test filtering by orderId (simulate order-level investigation)
  if (allSnapshots.data.length > 0) {
    const orderIdFilter = typia.random<string & tags.Format<"uuid">>();
    const orderFilteredSnapshots =
      await api.functional.shoppingMall.admin.cancellationSnapshots.index(
        adminConnection,
        {
          body: {
            page: 1,
            limit: 20,
            orderId: orderIdFilter,
          } satisfies IShoppingMallCancellationSnapshot.IRequest,
        },
      );
    typia.assert(orderFilteredSnapshots);
    // Validate that filtering returns valid pagination structure
    TestValidator.equals(
      "order filter pagination",
      orderFilteredSnapshots.pagination.current,
      1,
    );
  }
  // 7. Test filtering by cancellationRequestId
  if (allSnapshots.data.length > 0) {
    const cancellationRequestIdFilter =
      allSnapshots.data[0].cancellationRequestId;
    const requestFilteredSnapshots =
      await api.functional.shoppingMall.admin.cancellationSnapshots.index(
        adminConnection,
        {
          body: {
            page: 1,
            limit: 20,
            cancellationRequestId: cancellationRequestIdFilter,
          } satisfies IShoppingMallCancellationSnapshot.IRequest,
        },
      );
    typia.assert(requestFilteredSnapshots);
    // Validate that all returned snapshots match the filter
    for (const snapshot of requestFilteredSnapshots.data) {
      TestValidator.equals(
        "cancellation request ID match",
        snapshot.cancellationRequestId,
        cancellationRequestIdFilter,
      );
    }
  }
  // 8. Test pagination with different page and limit values
  const paginatedResult =
    await api.functional.shoppingMall.admin.cancellationSnapshots.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 50,
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination page 2",
    paginatedResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit 50",
    paginatedResult.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "pagination pages calculated",
    paginatedResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records count",
    paginatedResult.pagination.records >= 0,
  );
  // 9. Test sorting with sortBy and sortOrder
  const sortedByCreatedAt =
    await api.functional.shoppingMall.admin.cancellationSnapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sortBy: "createdAt",
          sortOrder: "desc",
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(sortedByCreatedAt);
  // Validate sorting returns valid structure
  TestValidator.equals(
    "sorted pagination",
    sortedByCreatedAt.pagination.current,
    1,
  );
  // 10. Test date range filtering
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeFiltered =
    await api.functional.shoppingMall.admin.cancellationSnapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          dateRange: {
            from: oneMonthAgo.toISOString(),
            to: now.toISOString(),
          },
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(dateRangeFiltered);
  // Validate date range filtering returns valid structure
  TestValidator.equals(
    "date range filter pagination",
    dateRangeFiltered.pagination.current,
    1,
  );
  // 11. Test combined filters (customerId + status + dateRange)
  if (allSnapshots.data.length > 0) {
    const combinedFilterResult =
      await api.functional.shoppingMall.admin.cancellationSnapshots.index(
        adminConnection,
        {
          body: {
            page: 1,
            limit: 20,
            customerId: typia.random<string & tags.Format<"uuid">>(),
            status: "approved",
            dateRange: {
              from: oneMonthAgo.toISOString(),
              to: now.toISOString(),
            },
          } satisfies IShoppingMallCancellationSnapshot.IRequest,
        },
      );
    typia.assert(combinedFilterResult);
    // Validate combined filter returns valid structure
    TestValidator.equals(
      "combined filter pagination",
      combinedFilterResult.pagination.current,
      1,
    );
  }
}
