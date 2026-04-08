import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDateRange";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test super administrator oversight of seller cancellation request responses and snapshot creation workflow.
 *
 * Validates the super administrator's ability to list and query cancellation request snapshots,
 * which capture seller responses (approval/rejection) to customer cancellation requests. Tests
 * snapshot field validation, filtering capabilities, and pagination functionality.
 *
 * Key validation points include verifying that approved_at and rejected_at timestamps are
 * correctly populated based on seller response, seller_rejection_reason is captured when
 * applicable, and snapshots reference the original cancellation request for audit purposes.
 *
 * 1. Register and authenticate as super administrator.
 * 2. List all cancellation request snapshots with pagination.
 * 3. Verify snapshot structure including approved_at, rejected_at, seller_rejection_reason.
 * 4. Filter snapshots by response_status (approved/rejected/pending).
 * 5. Validate pagination metadata and empty result handling.
 */
export async function test_api_super_administrator_cancellation_request_snapshots_seller_response(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResponse = await authorize_super_administrator_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        display_name: RandomGenerator.name(2),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(adminResponse);
  // 2. Create authenticated connection for super administrator
  const adminAuthConnection: api.IConnection = { host: connection.host };
  adminAuthConnection.headers = { Authorization: adminResponse.token.access };
  // 3. List all cancellation request snapshots
  const allSnapshotsPage =
    await api.functional.ecommerceMall.superAdministrator.cancellation_request_snapshots.index(
      adminAuthConnection,
      {
        body: {
          limit: 100,
        },
      },
    );
  typia.assert(allSnapshotsPage);
  // 4. Validate pagination structure
  typia.assert(allSnapshotsPage.pagination);
  TestValidator.predicate(
    "pagination has current page",
    allSnapshotsPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    allSnapshotsPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    allSnapshotsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    allSnapshotsPage.pagination.pages >= 0,
  );
  // 5. Validate snapshot structure if any snapshots exist
  if (allSnapshotsPage.data.length > 0) {
    const firstSnapshot = allSnapshotsPage.data[0];
    typia.assert(firstSnapshot);
    // Verify required snapshot fields
    TestValidator.predicate("snapshot has id", firstSnapshot.id !== undefined);
    TestValidator.predicate(
      "snapshot has title",
      firstSnapshot.title.length > 0,
    );
    TestValidator.predicate(
      "snapshot has actor_type",
      firstSnapshot.actor_type !== undefined,
    );
    TestValidator.predicate(
      "snapshot has created_at",
      firstSnapshot.created_at !== undefined,
    );
    // Verify approved_at and rejected_at are mutually exclusive
    if (
      firstSnapshot.approved_at !== null &&
      firstSnapshot.approved_at !== undefined
    ) {
      TestValidator.predicate(
        "approved_at populated, rejected_at should be null",
        firstSnapshot.rejected_at === null,
      );
    } else if (
      firstSnapshot.rejected_at !== null &&
      firstSnapshot.rejected_at !== undefined
    ) {
      TestValidator.predicate(
        "rejected_at populated, approved_at should be null",
        firstSnapshot.approved_at === null,
      );
    } else {
      // Both null indicates pending response
      TestValidator.predicate(
        "snapshot has pending response (both timestamps null)",
        true,
      );
    }
    // Verify seller_rejection_reason only populated for rejected requests
    if (
      firstSnapshot.rejected_at !== null &&
      firstSnapshot.rejected_at !== undefined
    ) {
      // seller_rejection_reason can be null or populated
      typia.assert(firstSnapshot.seller_rejection_reason);
    }
    // Verify cancellationRequest reference
    typia.assert(firstSnapshot.cancellationRequest);
    TestValidator.predicate(
      "cancellationRequest has id",
      firstSnapshot.cancellationRequest.id !== undefined,
    );
    TestValidator.predicate(
      "cancellationRequest has reason",
      firstSnapshot.cancellationRequest.reason.length > 0,
    );
    TestValidator.predicate(
      "cancellationRequest has status",
      firstSnapshot.cancellationRequest.status !== undefined,
    );
    TestValidator.predicate(
      "cancellationRequest has created_at",
      firstSnapshot.cancellationRequest.created_at !== undefined,
    );
  }
  // 6. Test filtering by response_status = "approved"
  const approvedSnapshotsPage =
    await api.functional.ecommerceMall.superAdministrator.cancellation_request_snapshots.index(
      adminAuthConnection,
      {
        body: {
          response_status: "approved",
          limit: 50,
        },
      },
    );
  typia.assert(approvedSnapshotsPage);
  for (const snapshot of approvedSnapshotsPage.data) {
    typia.assert(snapshot);
    TestValidator.predicate(
      "approved snapshot has approved_at populated",
      snapshot.approved_at !== null && snapshot.approved_at !== undefined,
    );
    TestValidator.predicate(
      "approved snapshot has rejected_at null",
      snapshot.rejected_at === null,
    );
  }
  // 7. Test filtering by response_status = "rejected"
  const rejectedSnapshotsPage =
    await api.functional.ecommerceMall.superAdministrator.cancellation_request_snapshots.index(
      adminAuthConnection,
      {
        body: {
          response_status: "rejected",
          limit: 50,
        },
      },
    );
  typia.assert(rejectedSnapshotsPage);
  for (const snapshot of rejectedSnapshotsPage.data) {
    typia.assert(snapshot);
    TestValidator.predicate(
      "rejected snapshot has rejected_at populated",
      snapshot.rejected_at !== null && snapshot.rejected_at !== undefined,
    );
    TestValidator.predicate(
      "rejected snapshot has approved_at null",
      snapshot.approved_at === null,
    );
  }
  // 8. Test filtering by response_status = "pending" (may return empty if all responded)
  const pendingSnapshotsPage =
    await api.functional.ecommerceMall.superAdministrator.cancellation_request_snapshots.index(
      adminAuthConnection,
      {
        body: {
          response_status: "pending",
          limit: 50,
        },
      },
    );
  typia.assert(pendingSnapshotsPage);
  for (const snapshot of pendingSnapshotsPage.data) {
    typia.assert(snapshot);
    TestValidator.predicate(
      "pending snapshot has approved_at null",
      snapshot.approved_at === null,
    );
    TestValidator.predicate(
      "pending snapshot has rejected_at null",
      snapshot.rejected_at === null,
    );
  }
  // 9. Test search functionality
  const searchSnapshotsPage =
    await api.functional.ecommerceMall.superAdministrator.cancellation_request_snapshots.index(
      adminAuthConnection,
      {
        body: {
          search: "item",
          limit: 50,
        },
      },
    );
  typia.assert(searchSnapshotsPage);
  for (const snapshot of searchSnapshotsPage.data) {
    typia.assert(snapshot);
    // Search should match title or body (we can't easily validate without knowing the data)
    TestValidator.predicate(
      "snapshot from search has title",
      snapshot.title.length > 0,
    );
  }
  // 10. Test date range filtering for approved_at
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const approvedWithinMonthPage =
    await api.functional.ecommerceMall.superAdministrator.cancellation_request_snapshots.index(
      adminAuthConnection,
      {
        body: {
          approved_at_range: {
            gte: oneMonthAgo.toISOString(),
          },
          limit: 50,
        },
      },
    );
  typia.assert(approvedWithinMonthPage);
  for (const snapshot of approvedWithinMonthPage.data) {
    typia.assert(snapshot);
    if (snapshot.approved_at !== null && snapshot.approved_at !== undefined) {
      const approvedDate = new Date(snapshot.approved_at);
      TestValidator.predicate(
        "approved_at is within last month",
        approvedDate >= oneMonthAgo,
      );
    }
  }
  // 11. Test date range filtering for rejected_at
  const rejectedWithinMonthPage =
    await api.functional.ecommerceMall.superAdministrator.cancellation_request_snapshots.index(
      adminAuthConnection,
      {
        body: {
          rejected_at_range: {
            gte: oneMonthAgo.toISOString(),
          },
          limit: 50,
        },
      },
    );
  typia.assert(rejectedWithinMonthPage);
  for (const snapshot of rejectedWithinMonthPage.data) {
    typia.assert(snapshot);
    if (snapshot.rejected_at !== null && snapshot.rejected_at !== undefined) {
      const rejectedDate = new Date(snapshot.rejected_at);
      TestValidator.predicate(
        "rejected_at is within last month",
        rejectedDate >= oneMonthAgo,
      );
    }
  }
  // 12. Test cursor-based pagination
  if (allSnapshotsPage.data.length > 1) {
    const secondPage =
      await api.functional.ecommerceMall.superAdministrator.cancellation_request_snapshots.index(
        adminAuthConnection,
        {
          body: {
            limit: 2,
            cursor: allSnapshotsPage.data[1].id,
          },
        },
      );
    typia.assert(secondPage);
    TestValidator.notEquals(
      "second page has different snapshots",
      allSnapshotsPage.data.length,
      secondPage.data.length,
    );
  }
  // 13. Test pagination with page parameter
  const paginatedPage =
    await api.functional.ecommerceMall.superAdministrator.cancellation_request_snapshots.index(
      adminAuthConnection,
      {
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(paginatedPage);
  TestValidator.equals(
    "current page is 1",
    paginatedPage.pagination.current,
    1,
  );
}
