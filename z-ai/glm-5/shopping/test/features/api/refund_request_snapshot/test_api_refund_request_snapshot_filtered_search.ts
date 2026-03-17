import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_refund_request_snapshot_filtered_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Get all snapshots without filter for baseline
  const allSnapshots =
    await api.functional.shoppingMall.administrator.refund_request_snapshots.index(
      adminConnection,
      {
        body: {
          limit: 100,
        } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // 3. Test status filtering - approved
  const approvedSnapshots =
    await api.functional.shoppingMall.administrator.refund_request_snapshots.index(
      adminConnection,
      {
        body: {
          status: "approved",
          limit: 100,
        } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedSnapshots);
  TestValidator.predicate(
    "all filtered snapshots have approved status",
    approvedSnapshots.data.every((s) => s.status === "approved"),
  );
  // 4. Test status filtering - rejected
  const rejectedSnapshots =
    await api.functional.shoppingMall.administrator.refund_request_snapshots.index(
      adminConnection,
      {
        body: {
          status: "rejected",
          limit: 100,
        } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(rejectedSnapshots);
  TestValidator.predicate(
    "all filtered snapshots have rejected status",
    rejectedSnapshots.data.every((s) => s.status === "rejected"),
  );
  // 5. Test status filtering - pending
  const pendingSnapshots =
    await api.functional.shoppingMall.administrator.refund_request_snapshots.index(
      adminConnection,
      {
        body: {
          status: "pending",
          limit: 100,
        } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(pendingSnapshots);
  TestValidator.predicate(
    "all filtered snapshots have pending status",
    pendingSnapshots.data.every((s) => s.status === "pending"),
  );
  // 6. Test date range filtering
  if (allSnapshots.data.length > 0) {
    const sortedByDate = [...allSnapshots.data].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const midIndex = Math.floor(sortedByDate.length / 2);
    const midDate = sortedByDate[midIndex].created_at;
    const dateFilteredSnapshots =
      await api.functional.shoppingMall.administrator.refund_request_snapshots.index(
        adminConnection,
        {
          body: {
            created_at_from: sortedByDate[0].created_at,
            created_at_to: midDate,
            limit: 100,
          } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
        },
      );
    typia.assert(dateFilteredSnapshots);
    TestValidator.predicate(
      "date range filter returns snapshots within range",
      dateFilteredSnapshots.data.every(
        (s) =>
          new Date(s.created_at).getTime() >=
            new Date(sortedByDate[0].created_at).getTime() &&
          new Date(s.created_at).getTime() <= new Date(midDate).getTime(),
      ),
    );
  }
  // 7. Test combined filtering (status + date range)
  if (approvedSnapshots.data.length > 1) {
    const sortedApproved = [...approvedSnapshots.data].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const from = sortedApproved[0].created_at;
    const to = sortedApproved[sortedApproved.length - 1].created_at;
    const combinedFiltered =
      await api.functional.shoppingMall.administrator.refund_request_snapshots.index(
        adminConnection,
        {
          body: {
            status: "approved",
            created_at_from: from,
            created_at_to: to,
            limit: 100,
          } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
        },
      );
    typia.assert(combinedFiltered);
    TestValidator.predicate(
      "combined filter returns approved snapshots in date range",
      combinedFiltered.data.every(
        (s) =>
          s.status === "approved" &&
          new Date(s.created_at).getTime() >= new Date(from).getTime() &&
          new Date(s.created_at).getTime() <= new Date(to).getTime(),
      ),
    );
  }
  // 8. Test pagination
  const page1 =
    await api.functional.shoppingMall.administrator.refund_request_snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.predicate("page 1 limit is 5", page1.pagination.limit === 5);
  TestValidator.predicate(
    "page 1 data has at most 5 items",
    page1.data.length <= 5,
  );
  if (allSnapshots.data.length > 5) {
    const page2 =
      await api.functional.shoppingMall.administrator.refund_request_snapshots.index(
        adminConnection,
        {
          body: {
            page: 2,
            limit: 5,
          } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
        },
      );
    typia.assert(page2);
    TestValidator.equals("page 2 current", page2.pagination.current, 2);
    TestValidator.predicate(
      "page 1 and page 2 have different snapshots",
      page1.data.length === 0 ||
        page2.data.length === 0 ||
        page1.data[0].id !== page2.data[0].id,
    );
  }
  // 9. Test pagination with status filter
  if (approvedSnapshots.data.length > 3) {
    const approvedPage1 =
      await api.functional.shoppingMall.administrator.refund_request_snapshots.index(
        adminConnection,
        {
          body: {
            status: "approved",
            page: 1,
            limit: 2,
          } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
        },
      );
    typia.assert(approvedPage1);
    TestValidator.predicate(
      "approved page 1 all have approved status",
      approvedPage1.data.every((s) => s.status === "approved"),
    );
    TestValidator.predicate(
      "approved page 1 has at most 2 items",
      approvedPage1.data.length <= 2,
    );
  }
}
