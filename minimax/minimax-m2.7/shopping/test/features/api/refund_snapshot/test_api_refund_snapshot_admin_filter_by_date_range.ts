import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin filtering of refund request snapshots by date range.
 *
 * Scenario:
 * 1. Authenticate as administrator
 * 2. Retrieve refund request snapshots with date range filters
 * 3. Verify that results include only snapshots with created_at within the specified range
 * 4. Test with a date range that excludes all existing snapshots (future dates)
 * 5. Verify empty data array with pagination showing zero records
 * 6. Test combining date range filter with other filters like snapshot_status
 */
export async function test_api_refund_snapshot_admin_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    name: RandomGenerator.name(),
    href: `https://test.example.com/${RandomGenerator.alphabets(8)}`,
    referrer: `https://test.example.com/${RandomGenerator.alphabets(8)}`,
  } satisfies IEcommerceMallAdmin.IJoin;
  const adminAuth = await api.functional.ecommerceMall.auth.admin.join(
    connection,
    { body: adminJoinInput },
  );
  typia.assert(adminAuth);
  // Create admin connection with authorization token
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${adminAuth.token.access}`,
    },
  };
  // 2. Get all refund request snapshots without filters to establish baseline
  const allSnapshots =
    await api.functional.ecommerceMall.admin.refund_request_snapshots.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // 3. Test filtering by date range encompassing existing snapshots
  if (allSnapshots.data.length > 0) {
    const snapshotDate = new Date(allSnapshots.data[0].created_at);
    const startDate = new Date(snapshotDate.getTime() - 86400000 * 365); // 1 year before
    const endDate = new Date(snapshotDate.getTime() + 86400000 * 365); // 1 year after
    const filteredSnapshots =
      await api.functional.ecommerceMall.admin.refund_request_snapshots.index(
        adminConnection,
        {
          body: {
            startDate: startDate.toISOString() satisfies string &
              tags.Format<"date-time">,
            endDate: endDate.toISOString() satisfies string &
              tags.Format<"date-time">,
          } satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
        },
      );
    typia.assert(filteredSnapshots);
    // Verify all returned snapshots have created_at within the date range
    for (const snapshot of filteredSnapshots.data) {
      const snapshotTime = new Date(snapshot.created_at).getTime();
      TestValidator.predicate(
        "snapshot created_at >= startDate",
        snapshotTime >= startDate.getTime(),
      );
      TestValidator.predicate(
        "snapshot created_at <= endDate",
        snapshotTime <= endDate.getTime(),
      );
    }
  }
  // 4. Test with date range excluding all existing snapshots (future dates)
  const futureStartDate = new Date(Date.now() + 86400000 * 365); // 1 year from now
  const futureEndDate = new Date(Date.now() + 86400000 * 730); // 2 years from now
  const futureDateFiltered =
    await api.functional.ecommerceMall.admin.refund_request_snapshots.index(
      adminConnection,
      {
        body: {
          startDate: futureStartDate.toISOString() satisfies string &
            tags.Format<"date-time">,
          endDate: futureEndDate.toISOString() satisfies string &
            tags.Format<"date-time">,
        } satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(futureDateFiltered);
  // 5. Verify empty data array with pagination showing zero records
  TestValidator.equals(
    "empty data array for future date range",
    futureDateFiltered.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is zero",
    futureDateFiltered.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is zero",
    futureDateFiltered.pagination.pages,
    0,
  );
  // 6. Test combining date range filter with snapshot_status filter
  if (allSnapshots.data.length > 0) {
    const snapshotDate = new Date(allSnapshots.data[0].created_at);
    const startDate = new Date(snapshotDate.getTime() - 86400000 * 365);
    const endDate = new Date(snapshotDate.getTime() + 86400000 * 365);
    const snapshotStatus = allSnapshots.data[0].snapshot_status;
    const combinedFilterResult =
      await api.functional.ecommerceMall.admin.refund_request_snapshots.index(
        adminConnection,
        {
          body: {
            startDate: startDate.toISOString() satisfies string &
              tags.Format<"date-time">,
            endDate: endDate.toISOString() satisfies string &
              tags.Format<"date-time">,
            snapshot_status: snapshotStatus as
              | "pending"
              | "approved"
              | "rejected",
          } satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
        },
      );
    typia.assert(combinedFilterResult);
    // Verify all returned snapshots match both filters
    for (const snapshot of combinedFilterResult.data) {
      TestValidator.equals(
        "snapshot_status matches filter",
        snapshot.snapshot_status,
        snapshotStatus,
      );
      const snapshotTime = new Date(snapshot.created_at).getTime();
      TestValidator.predicate(
        "created_at within date range",
        snapshotTime >= startDate.getTime() &&
          snapshotTime <= endDate.getTime(),
      );
    }
  }
}