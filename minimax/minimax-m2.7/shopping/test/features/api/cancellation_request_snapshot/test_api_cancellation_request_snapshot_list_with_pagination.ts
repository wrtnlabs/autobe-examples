import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an administrator can retrieve a paginated list of cancellation request snapshots.
 *
 * This test verifies:
 * 1. Admin can access the cancellation request snapshot listing endpoint
 * 2. Response includes pagination metadata (current page, total records, total pages)
 * 3. Returns snapshot summaries containing id, cancellation request context, reason, status, and createdAt
 * 4. Default sort is by createdAt descending (newest first)
 * 5. limit parameter controls page size (default 20, max 100)
 * 6. page parameter navigates through results correctly
 */
export async function test_api_cancellation_request_snapshot_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Get first page with default settings (should return up to 20 items)
  const defaultPage =
    await api.functional.ecommerceMall.admin.cancellation_request_snapshots.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(defaultPage);
  // 3. Validate pagination metadata structure
  TestValidator.equals(
    "pagination current is number",
    typeof defaultPage.pagination.current === "number",
    true,
  );
  TestValidator.equals(
    "pagination limit is number",
    typeof defaultPage.pagination.limit === "number",
    true,
  );
  TestValidator.equals(
    "pagination records is number",
    typeof defaultPage.pagination.records === "number",
    true,
  );
  TestValidator.equals(
    "pagination pages is number",
    typeof defaultPage.pagination.pages === "number",
    true,
  );
  // 4. Validate snapshot summary structure in data array
  if (defaultPage.data.length > 0) {
    const firstSnapshot = defaultPage.data[0];
    TestValidator.equals(
      "snapshot has id",
      typeof firstSnapshot.id === "string",
      true,
    );
    TestValidator.equals(
      "snapshot has reason",
      typeof firstSnapshot.reason === "string",
      true,
    );
    TestValidator.equals(
      "snapshot has status",
      typeof firstSnapshot.status === "string",
      true,
    );
    TestValidator.equals(
      "snapshot has createdAt",
      typeof firstSnapshot.createdAt === "string",
      true,
    );
    TestValidator.equals(
      "snapshot has cancellationRequest",
      firstSnapshot.cancellationRequest !== null,
      true,
    );
    // Validate status values are valid
    const validStatuses = ["approved", "rejected"];
    TestValidator.predicate(
      "status is valid value",
      validStatuses.includes(firstSnapshot.status),
    );
  }
  // 5. Test limit parameter - request page with smaller limit
  const limitedPage =
    await api.functional.ecommerceMall.admin.cancellation_request_snapshots.index(
      adminConnection,
      {
        body: {
          limit: 5,
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(limitedPage);
  TestValidator.equals(
    "limited page has limit 5",
    limitedPage.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "limited page data count <= 5",
    limitedPage.data.length <= 5,
  );
  // 6. Test limit parameter with max value (100)
  const maxLimitPage =
    await api.functional.ecommerceMall.admin.cancellation_request_snapshots.index(
      adminConnection,
      {
        body: {
          limit: 100,
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(maxLimitPage);
  TestValidator.equals(
    "max limit page has limit 100",
    maxLimitPage.pagination.limit,
    100,
  );
  // 7. Test pagination - request second page if there are enough records
  if (defaultPage.pagination.records > defaultPage.pagination.limit) {
    const secondPage =
      await api.functional.ecommerceMall.admin.cancellation_request_snapshots.index(
        adminConnection,
        {
          body: {
            page: 2,
          } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
        },
      );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page current is 2",
      secondPage.pagination.current,
      2,
    );
    // Verify records from page 1 and page 2 are different (assuming different data)
    if (defaultPage.data.length > 0 && secondPage.data.length > 0) {
      TestValidator.notEquals(
        "page 2 has different data than page 1",
        defaultPage.data[0].id,
        secondPage.data[0].id,
      );
    }
  }
  // 8. Test sorting - verify data is sorted by createdAt descending (newest first)
  if (defaultPage.data.length > 1) {
    const timestamps = defaultPage.data.map((s) =>
      new Date(s.createdAt).getTime(),
    );
    const isDescending = timestamps.every(
      (ts, i) => i === 0 || timestamps[i - 1] >= ts,
    );
    TestValidator.predicate(
      "snapshots sorted by createdAt descending",
      isDescending,
    );
  }
  // 9. Test filtering by status - approved
  const approvedOnlyPage =
    await api.functional.ecommerceMall.admin.cancellation_request_snapshots.index(
      adminConnection,
      {
        body: {
          status: "approved",
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedOnlyPage);
  if (approvedOnlyPage.data.length > 0) {
    const allApproved = approvedOnlyPage.data.every(
      (s) => s.status === "approved",
    );
    TestValidator.predicate("all results are approved status", allApproved);
  }
  // 10. Test filtering by status - rejected
  const rejectedOnlyPage =
    await api.functional.ecommerceMall.admin.cancellation_request_snapshots.index(
      adminConnection,
      {
        body: {
          status: "rejected",
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(rejectedOnlyPage);
  if (rejectedOnlyPage.data.length > 0) {
    const allRejected = rejectedOnlyPage.data.every(
      (s) => s.status === "rejected",
    );
    TestValidator.predicate("all results are rejected status", allRejected);
  }
  // 11. Test page calculation accuracy
  if (defaultPage.pagination.records > 0) {
    const expectedPages = Math.ceil(
      defaultPage.pagination.records / defaultPage.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation is accurate",
      defaultPage.pagination.pages,
      expectedPages,
    );
  }
}
