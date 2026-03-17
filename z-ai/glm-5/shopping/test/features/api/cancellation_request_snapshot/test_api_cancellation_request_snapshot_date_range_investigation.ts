import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test time-based investigation scenario where an administrator searches for
 * cancellation request snapshots within a specific date range and filters by status.
 * Tests date range filtering, status filtering, and full-text search capabilities.
 */
export async function test_api_cancellation_request_snapshot_date_range_investigation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Define date range for filtering (last 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const from = thirtyDaysAgo.toISOString();
  const to = now.toISOString();
  // 3. Test date range filtering with approved status
  const approvedResult =
    await api.functional.shoppingMall.administrator.cancellation_request_snapshots.index(
      adminConnection,
      {
        body: {
          from,
          to,
          status: "approved",
          limit: 10,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedResult);
  // 4. Verify date range filtering - all returned snapshots should be within range
  TestValidator.predicate(
    "all approved snapshots within date range",
    approvedResult.data.every(
      (snapshot) =>
        new Date(snapshot.created_at) >= thirtyDaysAgo &&
        new Date(snapshot.created_at) <= now,
    ),
  );
  // 5. Verify status filtering - all returned snapshots should be approved
  TestValidator.predicate(
    "all snapshots have approved status",
    approvedResult.data.every((snapshot) => snapshot.status === "approved"),
  );
  // 6. Test date range filtering with rejected status
  const rejectedResult =
    await api.functional.shoppingMall.administrator.cancellation_request_snapshots.index(
      adminConnection,
      {
        body: {
          from,
          to,
          status: "rejected",
          limit: 10,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(rejectedResult);
  // 7. Verify status filtering - all returned snapshots should be rejected
  TestValidator.predicate(
    "all snapshots have rejected status",
    rejectedResult.data.every((snapshot) => snapshot.status === "rejected"),
  );
  // 8. Test full-text search on reason field
  const searchResult =
    await api.functional.shoppingMall.administrator.cancellation_request_snapshots.index(
      adminConnection,
      {
        body: {
          search: "cancel",
          limit: 10,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(searchResult);
  // 9. Verify search results contain matching reason text (case-insensitive partial match)
  TestValidator.predicate(
    "search results contain matching text",
    searchResult.data.every((snapshot) =>
      snapshot.reason.toLowerCase().includes("cancel"),
    ),
  );
  // 10. Test combined date range and search filtering
  const combinedResult =
    await api.functional.shoppingMall.administrator.cancellation_request_snapshots.index(
      adminConnection,
      {
        body: {
          from,
          to,
          search: "cancel",
          limit: 10,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(combinedResult);
  // 11. Verify combined filtering works correctly
  TestValidator.predicate(
    "combined date range and search results are valid",
    combinedResult.data.every(
      (snapshot) =>
        new Date(snapshot.created_at) >= thirtyDaysAgo &&
        new Date(snapshot.created_at) <= now &&
        snapshot.reason.toLowerCase().includes("cancel"),
    ),
  );
  // 12. Test pagination works correctly
  const paginatedResult =
    await api.functional.shoppingMall.administrator.cancellation_request_snapshots.index(
      adminConnection,
      {
        body: {
          from,
          to,
          page: 1,
          limit: 5,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(paginatedResult);
  // 13. Verify pagination metadata
  TestValidator.equals(
    "current page is 1",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit is respected",
    paginatedResult.data.length <= 5,
  );
}
