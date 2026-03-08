import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_order_item_snapshots_index(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminResult);
  // 2. Test basic pagination - get first page with default settings
  const page1Response =
    await api.functional.ecommerceMall.admin.orderItemSnapshots.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(page1Response);
  TestValidator.equals(
    "pagination current page",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit (default 20)",
    page1Response.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    page1Response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    page1Response.pagination.pages >= 0,
  );
  TestValidator.equals(
    "data is array",
    Array.isArray(page1Response.data),
    true,
  );
  // 3. Test custom pagination with page and pageSize
  const page2Response =
    await api.functional.ecommerceMall.admin.orderItemSnapshots.index(
      adminConnection,
      {
        body: {
          page: 2,
          pageSize: 10,
        } satisfies IEcommerceMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(page2Response);
  TestValidator.equals("page 2 current", page2Response.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 10);
  TestValidator.predicate(
    "page 2 records non-negative",
    page2Response.pagination.records >= 0,
  );
  // Validate pages calculation: pages = ceil(records / limit)
  if (page2Response.pagination.records > 0) {
    const expectedPages = Math.ceil(page2Response.pagination.records / 10);
    TestValidator.equals(
      "page 2 pages calculation",
      page2Response.pagination.pages,
      expectedPages,
    );
  }
  // 4. Test filtering by old_status
  const paidSnapshots =
    await api.functional.ecommerceMall.admin.orderItemSnapshots.index(
      adminConnection,
      {
        body: {
          oldStatus: "paid",
        } satisfies IEcommerceMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(paidSnapshots);
  TestValidator.equals(
    "paid snapshots data is array",
    Array.isArray(paidSnapshots.data),
    true,
  );
  TestValidator.predicate(
    "paid snapshots records >= 0",
    paidSnapshots.pagination.records >= 0,
  );
  // 5. Test filtering by new_status
  const cancelledSnapshots =
    await api.functional.ecommerceMall.admin.orderItemSnapshots.index(
      adminConnection,
      {
        body: {
          newStatus: "cancelled",
        } satisfies IEcommerceMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(cancelledSnapshots);
  TestValidator.equals(
    "cancelled snapshots data is array",
    Array.isArray(cancelledSnapshots.data),
    true,
  );
  // 6. Test filtering by date range
  const fromDate = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const toDate = new Date().toISOString();
  const dateRangeSnapshots =
    await api.functional.ecommerceMall.admin.orderItemSnapshots.index(
      adminConnection,
      {
        body: {
          createdAtFrom: fromDate,
          createdAtTo: toDate,
        } satisfies IEcommerceMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(dateRangeSnapshots);
  TestValidator.equals(
    "date range data is array",
    Array.isArray(dateRangeSnapshots.data),
    true,
  );
  // 7. Test filtering by cancellation_request_id
  const testCidr = typia.random<string & tags.Format<"uuid">>();
  const cancellationSnapshots =
    await api.functional.ecommerceMall.admin.orderItemSnapshots.index(
      adminConnection,
      {
        body: {
          cancellationRequestId: testCidr,
        } satisfies IEcommerceMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(cancellationSnapshots);
  TestValidator.equals(
    "cancellation filter data is array",
    Array.isArray(cancellationSnapshots.data),
    true,
  );
  // 8. Test filtering by refund_request_id
  const testRrid = typia.random<string & tags.Format<"uuid">>();
  const refundSnapshots =
    await api.functional.ecommerceMall.admin.orderItemSnapshots.index(
      adminConnection,
      {
        body: {
          refundRequestId: testRrid,
        } satisfies IEcommerceMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(refundSnapshots);
  TestValidator.equals(
    "refund filter data is array",
    Array.isArray(refundSnapshots.data),
    true,
  );
  // 9. Test filtering by order_item_id
  const testOid = typia.random<string & tags.Format<"uuid">>();
  const orderItemSnapshots =
    await api.functional.ecommerceMall.admin.orderItemSnapshots.index(
      adminConnection,
      {
        body: {
          orderItemId: testOid,
        } satisfies IEcommerceMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(orderItemSnapshots);
  TestValidator.equals(
    "order item filter data is array",
    Array.isArray(orderItemSnapshots.data),
    true,
  );
  // 10. Test filtering by changed_by_seller_id
  const testSsid = typia.random<string & tags.Format<"uuid">>();
  const sellerSnapshots =
    await api.functional.ecommerceMall.admin.orderItemSnapshots.index(
      adminConnection,
      {
        body: {
          changedBySellerId: testSsid,
        } satisfies IEcommerceMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(sellerSnapshots);
  TestValidator.equals(
    "seller filter data is array",
    Array.isArray(sellerSnapshots.data),
    true,
  );
  // 11. Test combined filters
  const combinedSnapshots =
    await api.functional.ecommerceMall.admin.orderItemSnapshots.index(
      adminConnection,
      {
        body: {
          oldStatus: "paid",
          newStatus: "cancelled",
          createdAtFrom: fromDate,
          createdAtTo: toDate,
        } satisfies IEcommerceMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(combinedSnapshots);
  TestValidator.equals(
    "combined filters data is array",
    Array.isArray(combinedSnapshots.data),
    true,
  );
  // 12. Test sorting by createdAt ascending
  const sortedAscSnapshots =
    await api.functional.ecommerceMall.admin.orderItemSnapshots.index(
      adminConnection,
      {
        body: {
          sortBy: "createdAt",
          sortOrder: "asc",
        } satisfies IEcommerceMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(sortedAscSnapshots);
  TestValidator.equals(
    "sort asc data is array",
    Array.isArray(sortedAscSnapshots.data),
    true,
  );
  // 13. Test sorting by createdAt descending
  const sortedDescSnapshots =
    await api.functional.ecommerceMall.admin.orderItemSnapshots.index(
      adminConnection,
      {
        body: {
          sortBy: "createdAt",
          sortOrder: "desc",
        } satisfies IEcommerceMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(sortedDescSnapshots);
  TestValidator.equals(
    "sort desc data is array",
    Array.isArray(sortedDescSnapshots.data),
    true,
  );
  // 14. Test no matching results - query with unique ID that likely doesn't exist
  const noResults =
    await api.functional.ecommerceMall.admin.orderItemSnapshots.index(
      adminConnection,
      {
        body: {
          orderItemId: "00000000-0000-0000-0000-000000000000",
        } satisfies IEcommerceMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(noResults);
  TestValidator.equals(
    "no results data is empty array",
    noResults.data.length,
    0,
  );
  TestValidator.equals(
    "no results current page",
    noResults.pagination.current,
    1,
  );
  TestValidator.equals("no results records", noResults.pagination.records, 0);
  TestValidator.equals("no results pages", noResults.pagination.pages, 0);
  // 15. Test limit override
  const limitSnapshots =
    await api.functional.ecommerceMall.admin.orderItemSnapshots.index(
      adminConnection,
      {
        body: {
          limit: 5,
        } satisfies IEcommerceMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(limitSnapshots);
  TestValidator.equals(
    "limit override pagination",
    limitSnapshots.pagination.limit,
    5,
  );
  // 16. Test includeDeleted parameter
  const includeDeletedSnapshots =
    await api.functional.ecommerceMall.admin.orderItemSnapshots.index(
      adminConnection,
      {
        body: {
          includeDeleted: true,
        } satisfies IEcommerceMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(includeDeletedSnapshots);
  TestValidator.equals(
    "includeDeleted data is array",
    Array.isArray(includeDeletedSnapshots.data),
    true,
  );
  // 17. Validate snapshot structure if any data exists
  if (page1Response.data.length > 0) {
    const firstSnapshot = page1Response.data[0];
    typia.assert(firstSnapshot);
    TestValidator.predicate(
      "snapshot has id",
      typeof firstSnapshot.id === "string",
    );
    TestValidator.predicate(
      "snapshot has old_status",
      typeof firstSnapshot.old_status === "string",
    );
    TestValidator.predicate(
      "snapshot has new_status",
      typeof firstSnapshot.new_status === "string",
    );
    TestValidator.predicate(
      "snapshot has created_at",
      typeof firstSnapshot.created_at === "string",
    );
    // Optional fields can be null/undefined
    if (firstSnapshot.change_reason !== undefined) {
      TestValidator.predicate(
        "change_reason is string or null",
        firstSnapshot.change_reason === null ||
          typeof firstSnapshot.change_reason === "string",
      );
    }
    if (firstSnapshot.cancellation_request_id !== undefined) {
      TestValidator.predicate(
        "cancellation_request_id is string or null",
        firstSnapshot.cancellation_request_id === null ||
          typeof firstSnapshot.cancellation_request_id === "string",
      );
    }
    if (firstSnapshot.refund_request_id !== undefined) {
      TestValidator.predicate(
        "refund_request_id is string or null",
        firstSnapshot.refund_request_id === null ||
          typeof firstSnapshot.refund_request_id === "string",
      );
    }
  }
}
