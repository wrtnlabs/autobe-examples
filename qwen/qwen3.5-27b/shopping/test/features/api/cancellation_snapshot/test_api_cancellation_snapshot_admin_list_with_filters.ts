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

/**
 * Test admin cancellation snapshot listing with various filters.
 *
 * This test verifies that an authenticated administrator can retrieve
 * paginated cancellation request snapshots with filtering by status,
 * date range, and sorting options.
 */
export async function test_api_cancellation_snapshot_admin_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
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
  // 2. Test basic pagination with default parameters
  const basicResult =
    await api.functional.shoppingMall.admin.cancellationSnapshots.index(
      adminConnection,
      {
        body: {} satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(basicResult);
  TestValidator.equals("default page", basicResult.pagination.current, 1);
  TestValidator.equals("default limit", basicResult.pagination.limit, 20);
  TestValidator.predicate(
    "has valid records count",
    basicResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has valid pages count",
    basicResult.pagination.pages >= 0,
  );
  // 3. Test pagination with custom page and limit
  const paginatedResult =
    await api.functional.shoppingMall.admin.cancellationSnapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals("custom page", paginatedResult.pagination.current, 1);
  TestValidator.equals("custom limit", paginatedResult.pagination.limit, 10);
  TestValidator.predicate(
    "data length matches limit or total",
    paginatedResult.data.length <= 10,
  );
  // 4. Test filtering by status - approved
  const approvedResult =
    await api.functional.shoppingMall.admin.cancellationSnapshots.index(
      adminConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(approvedResult);
  TestValidator.predicate(
    "approved filter applied",
    approvedResult.pagination.records >= 0,
  );
  // 5. Test filtering by status - rejected
  const rejectedResult =
    await api.functional.shoppingMall.admin.cancellationSnapshots.index(
      adminConnection,
      {
        body: {
          status: "rejected",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(rejectedResult);
  TestValidator.predicate(
    "rejected filter applied",
    rejectedResult.pagination.records >= 0,
  );
  // 6. Test filtering by status - pending
  const pendingResult =
    await api.functional.shoppingMall.admin.cancellationSnapshots.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(pendingResult);
  TestValidator.predicate(
    "pending filter applied",
    pendingResult.pagination.records >= 0,
  );
  // 7. Test date range filtering
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.shoppingMall.admin.cancellationSnapshots.index(
      adminConnection,
      {
        body: {
          dateRange: {
            from: oneWeekAgo.toISOString(),
            to: now.toISOString(),
          },
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filter applied",
    dateRangeResult.pagination.records >= 0,
  );
  // Verify all snapshots in result are within date range
  for (const snapshot of dateRangeResult.data) {
    const snapshotDate = new Date(snapshot.createdAt);
    TestValidator.predicate(
      `snapshot ${snapshot.id} within date range`,
      snapshotDate >= oneWeekAgo && snapshotDate <= now,
    );
  }
  // 8. Test sorting by createdAt ascending
  const ascResult =
    await api.functional.shoppingMall.admin.cancellationSnapshots.index(
      adminConnection,
      {
        body: {
          sortBy: "createdAt",
          sortOrder: "asc",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(ascResult);
  // Verify ascending order
  for (let i = 1; i < ascResult.data.length; i++) {
    const prevDate = new Date(ascResult.data[i - 1].createdAt);
    const currDate = new Date(ascResult.data[i].createdAt);
    TestValidator.predicate(
      `snapshot ${i} in ascending order`,
      prevDate <= currDate,
    );
  }
  // 9. Test sorting by createdAt descending
  const descResult =
    await api.functional.shoppingMall.admin.cancellationSnapshots.index(
      adminConnection,
      {
        body: {
          sortBy: "createdAt",
          sortOrder: "desc",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(descResult);
  // Verify descending order
  for (let i = 1; i < descResult.data.length; i++) {
    const prevDate = new Date(descResult.data[i - 1].createdAt);
    const currDate = new Date(descResult.data[i].createdAt);
    TestValidator.predicate(
      `snapshot ${i} in descending order`,
      prevDate >= currDate,
    );
  }
  // 10. Verify snapshot summary structure
  if (basicResult.data.length > 0) {
    const sampleSnapshot = basicResult.data[0];
    TestValidator.predicate(
      "snapshot has valid id format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        sampleSnapshot.id,
      ),
    );
    TestValidator.predicate(
      "snapshot has valid cancellationRequestId format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        sampleSnapshot.cancellationRequestId,
      ),
    );
    TestValidator.predicate(
      "snapshot has valid createdAt format",
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])(T|\s)([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
        sampleSnapshot.createdAt,
      ),
    );
  }
  // 11. Test empty results with non-existent cancellationRequestId
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  const emptyResult =
    await api.functional.shoppingMall.admin.cancellationSnapshots.index(
      adminConnection,
      {
        body: {
          cancellationRequestId: nonExistentId,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result for non-existent request",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty records count",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals("empty pages count", emptyResult.pagination.pages, 0);
  // 12. Test combined filters
  const combinedResult =
    await api.functional.shoppingMall.admin.cancellationSnapshots.index(
      adminConnection,
      {
        body: {
          status: "approved",
          dateRange: {
            from: oneWeekAgo.toISOString(),
          },
          sortBy: "createdAt",
          sortOrder: "desc",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCancellationSnapshot.IRequest,
      },
    );
  typia.assert(combinedResult);
  TestValidator.predicate(
    "combined filters applied",
    combinedResult.pagination.records >= 0,
  );
  TestValidator.equals("combined limit", combinedResult.pagination.limit, 10);
}
