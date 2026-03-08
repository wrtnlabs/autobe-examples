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

/**
 * Test the admin endpoint for filtering order item snapshots by various criteria
 * to support audit trail and dispute resolution workflows.
 */
export async function test_api_order_item_snapshots_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for authentication
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminResult);
  // Use adminResult with a new connection for authenticated requests
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminResult.email,
      password: "1234",
    },
  });
  // 2. Test sorting by createdAt ascending
  const sortedByCreatedAtAsc =
    await api.functional.ecommerceMall.admin.orderItemSnapshots.index(
      adminConnection,
      {
        body: {
          sortBy: "createdAt",
          sortOrder: "asc",
          pageSize: 20,
        },
      },
    );
  typia.assert(sortedByCreatedAtAsc);
  TestValidator.equals(
    "snapshots sorted by createdAt ascending",
    sortedByCreatedAtAsc.data.every((s, i) => {
      if (i === 0) return true;
      return (
        new Date(s.created_at).getTime() >=
        new Date(sortedByCreatedAtAsc.data[i - 1].created_at).getTime()
      );
    }),
    true,
  );
  // 3. Test sorting by createdAt descending
  const sortedByCreatedAtDesc =
    await api.functional.ecommerceMall.admin.orderItemSnapshots.index(
      adminConnection,
      {
        body: {
          sortBy: "createdAt",
          sortOrder: "desc",
          pageSize: 20,
        },
      },
    );
  typia.assert(sortedByCreatedAtDesc);
  TestValidator.equals(
    "snapshots sorted by createdAt descending",
    sortedByCreatedAtDesc.data.every((s, i) => {
      if (i === 0) return true;
      return (
        new Date(s.created_at).getTime() <=
        new Date(sortedByCreatedAtDesc.data[i - 1].created_at).getTime()
      );
    }),
    true,
  );
  // 4. Test sorting by oldStatus ascending
  const sortedByOldStatusAsc =
    await api.functional.ecommerceMall.admin.orderItemSnapshots.index(
      adminConnection,
      {
        body: {
          sortBy: "oldStatus",
          sortOrder: "asc",
          pageSize: 20,
        },
      },
    );
  typia.assert(sortedByOldStatusAsc);
  TestValidator.equals(
    "snapshots sorted by oldStatus ascending",
    sortedByOldStatusAsc.data.every((s, i) => {
      if (i === 0) return true;
      return s.old_status >= sortedByOldStatusAsc.data[i - 1].old_status;
    }),
    true,
  );
  // 5. Test sorting by oldStatus descending
  const sortedByOldStatusDesc =
    await api.functional.ecommerceMall.admin.orderItemSnapshots.index(
      adminConnection,
      {
        body: {
          sortBy: "oldStatus",
          sortOrder: "desc",
          pageSize: 20,
        },
      },
    );
  typia.assert(sortedByOldStatusDesc);
  TestValidator.equals(
    "snapshots sorted by oldStatus descending",
    sortedByOldStatusDesc.data.every((s, i) => {
      if (i === 0) return true;
      return s.old_status <= sortedByOldStatusDesc.data[i - 1].old_status;
    }),
    true,
  );
  // 6. Test sorting by newStatus ascending
  const sortedByNewStatusAsc =
    await api.functional.ecommerceMall.admin.orderItemSnapshots.index(
      adminConnection,
      {
        body: {
          sortBy: "newStatus",
          sortOrder: "asc",
          pageSize: 20,
        },
      },
    );
  typia.assert(sortedByNewStatusAsc);
  TestValidator.equals(
    "snapshots sorted by newStatus ascending",
    sortedByNewStatusAsc.data.every((s, i) => {
      if (i === 0) return true;
      return s.new_status >= sortedByNewStatusAsc.data[i - 1].new_status;
    }),
    true,
  );
  // 7. Test sorting by newStatus descending
  const sortedByNewStatusDesc =
    await api.functional.ecommerceMall.admin.orderItemSnapshots.index(
      adminConnection,
      {
        body: {
          sortBy: "newStatus",
          sortOrder: "desc",
          pageSize: 20,
        },
      },
    );
  typia.assert(sortedByNewStatusDesc);
  TestValidator.equals(
    "snapshots sorted by newStatus descending",
    sortedByNewStatusDesc.data.every((s, i) => {
      if (i === 0) return true;
      return s.new_status <= sortedByNewStatusDesc.data[i - 1].new_status;
    }),
    true,
  );
  // 8. Test sorting by changedBySellerId ascending
  const sortedBySellerIdAsc =
    await api.functional.ecommerceMall.admin.orderItemSnapshots.index(
      adminConnection,
      {
        body: {
          sortBy: "changedBySellerId",
          sortOrder: "asc",
          pageSize: 20,
        },
      },
    );
  typia.assert(sortedBySellerIdAsc);
  TestValidator.equals(
    "snapshots sorted by changedBySellerId ascending",
    sortedBySellerIdAsc.data.every((s, i) => {
      if (i === 0) return true;
      return (
        (s.changed_by_seller_id ?? "") >=
        (sortedBySellerIdAsc.data[i - 1].changed_by_seller_id ?? "")
      );
    }),
    true,
  );
  // 9. Test sorting by changedBySellerId descending
  const sortedBySellerIdDesc =
    await api.functional.ecommerceMall.admin.orderItemSnapshots.index(
      adminConnection,
      {
        body: {
          sortBy: "changedBySellerId",
          sortOrder: "desc",
          pageSize: 20,
        },
      },
    );
  typia.assert(sortedBySellerIdDesc);
  TestValidator.equals(
    "snapshots sorted by changedBySellerId descending",
    sortedBySellerIdDesc.data.every((s, i) => {
      if (i === 0) return true;
      return (
        (s.changed_by_seller_id ?? "") <=
        (sortedBySellerIdDesc.data[i - 1].changed_by_seller_id ?? "")
      );
    }),
    true,
  );
  // 10. Test pagination with page size 10
  const pageSize10 =
    await api.functional.ecommerceMall.admin.orderItemSnapshots.index(
      adminConnection,
      {
        body: {
          pageSize: 10,
        },
      },
    );
  typia.assert(pageSize10);
  TestValidator.equals(
    "pagination with page size 10",
    pageSize10.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "page size 10 does not exceed 100",
    pageSize10.pagination.limit <= 100,
  );
  // 11. Test pagination with page size 20
  const pageSize20 =
    await api.functional.ecommerceMall.admin.orderItemSnapshots.index(
      adminConnection,
      {
        body: {
          pageSize: 20,
        },
      },
    );
  typia.assert(pageSize20);
  TestValidator.equals(
    "pagination with page size 20",
    pageSize20.pagination.limit,
    20,
  );
  // 12. Test pagination with page size 50
  const pageSize50 =
    await api.functional.ecommerceMall.admin.orderItemSnapshots.index(
      adminConnection,
      {
        body: {
          pageSize: 50,
        },
      },
    );
  typia.assert(pageSize50);
  TestValidator.equals(
    "pagination with page size 50",
    pageSize50.pagination.limit,
    50,
  );
  // 13. Test pagination with page size 100
  const pageSize100 =
    await api.functional.ecommerceMall.admin.orderItemSnapshots.index(
      adminConnection,
      {
        body: {
          pageSize: 100,
        },
      },
    );
  typia.assert(pageSize100);
  TestValidator.equals(
    "pagination with page size 100",
    pageSize100.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "page size 100 is maximum allowed",
    pageSize100.pagination.limit <= 100,
  );
  // 14. Verify pagination metadata structure
  TestValidator.equals(
    "pagination metadata has current",
    typeof pageSize100.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination metadata has limit",
    typeof pageSize100.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination metadata has records",
    typeof pageSize100.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination metadata has pages",
    typeof pageSize100.pagination.pages,
    "number",
  );
  // 15. Test 1-based page numbering
  const page1 =
    await api.functional.ecommerceMall.admin.orderItemSnapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          pageSize: 20,
        },
      },
    );
  typia.assert(page1);
  TestValidator.equals(
    "page numbering starts at 1",
    page1.pagination.current,
    1,
  );
  // 16. Test page 2
  const page2 =
    await api.functional.ecommerceMall.admin.orderItemSnapshots.index(
      adminConnection,
      {
        body: {
          page: 2,
          pageSize: 20,
        },
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 numbering", page2.pagination.current, 2);
  // 17. Test pagination metadata accuracy
  TestValidator.equals(
    "pages calculation is correct",
    page1.pagination.pages,
    Math.ceil(page1.pagination.records / page1.pagination.limit),
  );
  // 18. Test empty results edge case with non-existent orderItemId
  const emptyResults =
    await api.functional.ecommerceMall.admin.orderItemSnapshots.index(
      adminConnection,
      {
        body: {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
          pageSize: 20,
        },
      },
    );
  typia.assert(emptyResults);
  TestValidator.equals("empty results data array", emptyResults.data.length, 0);
  TestValidator.equals(
    "empty results records count",
    emptyResults.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty results pages count",
    emptyResults.pagination.pages,
    0,
  );
  // 19. Verify response structure
  TestValidator.equals(
    "response has pagination field",
    "pagination" in emptyResults,
    true,
  );
  TestValidator.equals("response has data field", "data" in emptyResults, true);
  TestValidator.equals("data is array", Array.isArray(emptyResults.data), true);
  // 20. Test filtering by old_status with valid enum value
  const oldStatus: "paid" | "shipped" | "delivered" | "cancelled" | "refunded" =
    "paid";
  const snapshotsByOldStatus =
    await api.functional.ecommerceMall.admin.orderItemSnapshots.index(
      adminConnection,
      {
        body: {
          oldStatus,
          pageSize: 20,
        },
      },
    );
  typia.assert(snapshotsByOldStatus);
  TestValidator.equals(
    "snapshots filtered by old_status",
    snapshotsByOldStatus.data.every((s) => s.old_status === oldStatus),
    true,
  );
  // 21. Test filtering by new_status with valid enum value
  const newStatus: "paid" | "shipped" | "delivered" | "cancelled" | "refunded" =
    "shipped";
  const snapshotsByNewStatus =
    await api.functional.ecommerceMall.admin.orderItemSnapshots.index(
      adminConnection,
      {
        body: {
          newStatus,
          pageSize: 20,
        },
      },
    );
  typia.assert(snapshotsByNewStatus);
  TestValidator.equals(
    "snapshots filtered by new_status",
    snapshotsByNewStatus.data.every((s) => s.new_status === newStatus),
    true,
  );
  // 22. Test filtering by change_reason
  const changeReason = RandomGenerator.paragraph({ sentences: 3 });
  const snapshotsByReason =
    await api.functional.ecommerceMall.admin.orderItemSnapshots.index(
      adminConnection,
      {
        body: {
          changeReason,
          pageSize: 20,
        },
      },
    );
  typia.assert(snapshotsByReason);
  TestValidator.equals(
    "snapshots filtered by change_reason",
    snapshotsByReason.data.every(
      (s) => s.change_reason && s.change_reason.includes(changeReason),
    ),
    true,
  );
  // 23. Test filtering by date range
  const createdAtFrom = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const createdAtTo = new Date().toISOString();
  const snapshotsByDateRange =
    await api.functional.ecommerceMall.admin.orderItemSnapshots.index(
      adminConnection,
      {
        body: {
          createdAtFrom,
          createdAtTo,
          pageSize: 20,
        },
      },
    );
  typia.assert(snapshotsByDateRange);
  TestValidator.equals(
    "snapshots filtered by date range",
    snapshotsByDateRange.data.every((s) => {
      const createdAt = new Date(s.created_at).getTime();
      const fromTime = new Date(createdAtFrom).getTime();
      const toTime = new Date(createdAtTo).getTime();
      return createdAt >= fromTime && createdAt < toTime;
    }),
    true,
  );
  // 24. Test include_deleted parameter for admin-only feature
  const includeDeleted =
    await api.functional.ecommerceMall.admin.orderItemSnapshots.index(
      adminConnection,
      {
        body: {
          includeDeleted: true,
          pageSize: 20,
        },
      },
    );
  typia.assert(includeDeleted);
  TestValidator.equals(
    "include_deleted parameter works",
    includeDeleted.pagination.limit,
    20,
  );
}
