import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministratorApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorApprovalRequestSnapshot";
import type { IEcommerceMallAdministratorApprovalRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorApprovalRequests";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdministratorApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdministratorApprovalRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test that a super administrator can filter administrator approval request snapshots by approval status.
 *
 * Validates the filtering functionality for administrator approval request snapshots, allowing super administrators to audit approval decisions by status. Tests both 'approved' and 'rejected' status filters to ensure proper restriction of results and correct field values in each snapshot type.
 *
 * Special attention is given to verifying that approved snapshots include the approved_grade field with actual grade value ('regular' or 'super') and rejected snapshots include the review_reason field with the super administrator's explanation. The reviewer information is verified for both status types.
 *
 * 1. Super administrator joins the platform with email, display_name, and password.
 * 2. System returns authorization tokens and super administrator summary.
 * 3. Super administrator filters snapshots by 'approved' status.
 * 4. System returns only approved snapshots with approved_grade and reviewer fields.
 * 5. Super administrator filters snapshots by 'rejected' status.
 * 6. System returns only rejected snapshots with review_reason and reviewer fields.
 * 7. Verify pagination reflects filtered counts correctly.
 * 8. Verify approved_grade is null for rejected snapshots.
 */
export async function test_api_administrator_approval_snapshot_filtering_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
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
  typia.assert(superAdmin);
  // 2. Test filtering by 'approved' status
  const approvedSnapshots =
    await api.functional.ecommerceMall.superAdministrator.administrator_approval_request_snapshots.index(
      superAdminConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(approvedSnapshots);
  // Verify pagination for approved filter
  TestValidator.equals(
    "approved pagination current",
    1,
    approvedSnapshots.pagination.current,
  );
  TestValidator.equals(
    "approved pagination limit",
    20,
    approvedSnapshots.pagination.limit,
  );
  // Verify all approved snapshots have correct fields
  for (const snapshot of approvedSnapshots.data) {
    typia.assert(snapshot);
    // Status must be 'approved'
    TestValidator.equals(
      "snapshot status approved",
      snapshot.status,
      "approved",
    );
    // approved_grade must be set (either 'regular' or 'super')
    TestValidator.predicate(
      "approved_grade is regular or super",
      snapshot.approved_grade === "regular" ||
        snapshot.approved_grade === "super",
    );
    // reviewer must be present (not null)
    TestValidator.equals("reviewer exists", snapshot.reviewer !== null, true);
  }
  // 3. Test filtering by 'rejected' status
  const rejectedSnapshots =
    await api.functional.ecommerceMall.superAdministrator.administrator_approval_request_snapshots.index(
      superAdminConnection,
      {
        body: {
          status: "rejected",
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(rejectedSnapshots);
  // Verify pagination for rejected filter
  TestValidator.equals(
    "rejected pagination current",
    1,
    rejectedSnapshots.pagination.current,
  );
  TestValidator.equals(
    "rejected pagination limit",
    20,
    rejectedSnapshots.pagination.limit,
  );
  // Verify all rejected snapshots have correct fields
  for (const snapshot of rejectedSnapshots.data) {
    typia.assert(snapshot);
    // Status must be 'rejected'
    TestValidator.equals(
      "snapshot status rejected",
      snapshot.status,
      "rejected",
    );
    // approved_grade must be null for rejected snapshots
    TestValidator.equals(
      "rejected approved_grade is null",
      snapshot.approved_grade,
      null,
    );
    // reviewer must be present (not null)
    TestValidator.equals("reviewer exists", snapshot.reviewer !== null, true);
    // review_reason must be present for rejected snapshots
    TestValidator.predicate(
      "review_reason exists",
      snapshot.review_reason !== null && snapshot.review_reason !== undefined,
    );
    TestValidator.predicate(
      "review_reason has content",
      snapshot.review_reason!.length > 0,
    );
  }
  // 4. Verify filtering is working correctly (not returning all snapshots)
  // The approved and rejected filters should return different results
  TestValidator.notEquals(
    "approved and rejected data differ",
    approvedSnapshots.data,
    rejectedSnapshots.data,
  );
  // 5. Verify snapshot immutability - querying again should return same data
  const approvedSnapshotsAgain =
    await api.functional.ecommerceMall.superAdministrator.administrator_approval_request_snapshots.index(
      superAdminConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(approvedSnapshotsAgain);
  TestValidator.equals(
    "approved pagination records unchanged",
    approvedSnapshots.pagination.records,
    approvedSnapshotsAgain.pagination.records,
  );
}
