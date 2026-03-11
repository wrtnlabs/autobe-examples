import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSnapshotAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSnapshotAudit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSnapshotAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSnapshotAudit";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_snapshot_audits_admin_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication - authorize function updates connection headers internally
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testpassword123",
      href: "https://admin.example.com/dashboard",
      referrer: "https://admin.example.com/login",
    },
  });
  typia.assert(admin);
  // 2. Get initial snapshot data to analyze existing timestamps
  const initialPage =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnection,
      {
        body: {
          limit: 100,
          page: 1,
        } satisfies IEcommerceMallSnapshotAudit.IRequest,
      },
    );
  typia.assert(initialPage);
  // 3. Test empty date range - should return all snapshots
  const noFilterPage =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnection,
      {
        body: {
          limit: 100,
          page: 1,
        } satisfies IEcommerceMallSnapshotAudit.IRequest,
      },
    );
  typia.assert(noFilterPage);
  TestValidator.equals(
    "no filter page count matches initial",
    noFilterPage.pagination.records,
    initialPage.pagination.records,
  );
  TestValidator.equals(
    "no filter data count matches initial",
    noFilterPage.data.length,
    initialPage.data.length,
  );
  // 4. Extract timestamps from existing snapshots
  const snapshots = noFilterPage.data;
  if (snapshots.length === 0) {
    TestValidator.predicate("snapshots exist for testing", false);
    return;
  }
  // Sort snapshots by changed_at to identify date range boundaries
  const sortedSnapshots = [...snapshots].sort(
    (a, b) =>
      new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime(),
  );
  // Get earliest and latest timestamps
  const earliestSnapshot = sortedSnapshots[0];
  const latestSnapshot = sortedSnapshots[sortedSnapshots.length - 1];
  const earliestDate = new Date(earliestSnapshot.changed_at);
  const latestDate = new Date(latestSnapshot.changed_at);
  // 5. Test from_changed_at filter (inclusive)
  const filterDate = new Date(
    earliestDate.getTime() +
      (latestDate.getTime() - earliestDate.getTime()) / 2,
  );
  const fromFilterPage =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnection,
      {
        body: {
          from_changed_at: filterDate.toISOString(),
          limit: 100,
          page: 1,
        } satisfies IEcommerceMallSnapshotAudit.IRequest,
      },
    );
  typia.assert(fromFilterPage);
  // Verify all returned snapshots have changed_at >= from_changed_at
  fromFilterPage.data.forEach((snapshot) => {
    const snapshotDate = new Date(snapshot.changed_at);
    TestValidator.predicate(
      `snapshot ${snapshot.id} changed_at >= from_changed_at`,
      snapshotDate.getTime() >= filterDate.getTime(),
    );
  });
  // 6. Test to_changed_at filter (exclusive)
  const toFilterPage =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnection,
      {
        body: {
          to_changed_at: filterDate.toISOString(),
          limit: 100,
          page: 1,
        } satisfies IEcommerceMallSnapshotAudit.IRequest,
      },
    );
  typia.assert(toFilterPage);
  // Verify all returned snapshots have changed_at < to_changed_at
  toFilterPage.data.forEach((snapshot) => {
    const snapshotDate = new Date(snapshot.changed_at);
    TestValidator.predicate(
      `snapshot ${snapshot.id} changed_at < to_changed_at`,
      snapshotDate.getTime() < filterDate.getTime(),
    );
  });
  // 7. Test combined date range filter
  const combinedPage =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnection,
      {
        body: {
          from_changed_at: filterDate.toISOString(),
          to_changed_at: new Date(
            latestDate.getTime() + 1000 * 60 * 60 * 24,
          ).toISOString(),
          limit: 100,
          page: 1,
        } satisfies IEcommerceMallSnapshotAudit.IRequest,
      },
    );
  typia.assert(combinedPage);
  // Verify all snapshots are within the range
  const toDateForCombined = new Date(
    latestDate.getTime() + 1000 * 60 * 60 * 24,
  );
  combinedPage.data.forEach((snapshot) => {
    const snapshotDate = new Date(snapshot.changed_at);
    TestValidator.predicate(
      `snapshot ${snapshot.id} changed_at >= from_changed_at`,
      snapshotDate.getTime() >= filterDate.getTime(),
    );
    TestValidator.predicate(
      `snapshot ${snapshot.id} changed_at < to_changed_at`,
      snapshotDate.getTime() < toDateForCombined.getTime(),
    );
  });
  // 8. Verify pagination metadata is correct
  TestValidator.equals(
    "pagination current page",
    combinedPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    combinedPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    combinedPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    combinedPage.pagination.pages >= 0,
  );
  // Verify pages calculation: pages = Math.ceil(records / limit)
  const expectedPages = Math.ceil(
    combinedPage.pagination.records / combinedPage.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages calculation correct",
    combinedPage.pagination.pages,
    expectedPages,
  );
  // 9. Verify total records matches data length (when limit >= data.length)
  if (combinedPage.pagination.limit >= combinedPage.data.length) {
    TestValidator.equals(
      "total records matches data length",
      combinedPage.pagination.records,
      combinedPage.data.length,
    );
  }
  // 10. Verify empty date range returns all snapshots
  const allSnapshotsPage =
    await api.functional.ecommerceMall.admin.snapshot_audits.index(
      adminConnection,
      {
        body: {
          limit: 100,
          page: 1,
        } satisfies IEcommerceMallSnapshotAudit.IRequest,
      },
    );
  typia.assert(allSnapshotsPage);
  TestValidator.equals(
    "all snapshots count matches no filter",
    allSnapshotsPage.pagination.records,
    noFilterPage.pagination.records,
  );
  TestValidator.equals(
    "all snapshots data length matches no filter",
    allSnapshotsPage.data.length,
    noFilterPage.data.length,
  );
  // 11. Verify changed_at field reflects actual change timestamps
  allSnapshotsPage.data.forEach((snapshot) => {
    // Parse and compare - should be identical strings
    TestValidator.equals(
      `snapshot ${snapshot.id} changed_at format valid`,
      snapshot.changed_at,
      new Date(snapshot.changed_at).toISOString(),
    );
  });
}
