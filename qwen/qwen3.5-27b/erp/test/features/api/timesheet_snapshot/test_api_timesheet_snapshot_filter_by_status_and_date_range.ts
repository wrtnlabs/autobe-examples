import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTimesheetSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheetSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimesheetSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimesheetSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test timesheet snapshot filtering by status and date ranges.
 *
 * Validates that the timesheet snapshots endpoint correctly filters results by:
 * - Status (draft, submitted, approved, rejected)
 * - Week start date range
 * - Submitted at date range
 * - Approved at date range
 * - Rejected at date range
 * - Combined filters
 * - Invalid date ranges (should return empty results)
 */
export async function test_api_timesheet_snapshot_filter_by_status_and_date_range(
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
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Get all timesheet snapshots to work with
  const allSnapshots: IPageIHrmPlatformTimesheetSnapshot.ISummary =
    await api.functional.hrmPlatform.admin.timesheet_snapshots.index(
      adminConnection,
      {
        body: {
          limit: 100,
        } satisfies IHrmPlatformTimesheetSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // 3. Test filtering by status: approved
  const approvedFilter: IPageIHrmPlatformTimesheetSnapshot.ISummary =
    await api.functional.hrmPlatform.admin.timesheet_snapshots.index(
      adminConnection,
      {
        body: {
          status: "approved",
          limit: 100,
        } satisfies IHrmPlatformTimesheetSnapshot.IRequest,
      },
    );
  typia.assert(approvedFilter);
  TestValidator.predicate(
    "approved filter returns only approved snapshots",
    approvedFilter.data.every((snap) => snap.status === "approved"),
  );
  // 4. Test filtering by status: submitted
  const submittedFilter: IPageIHrmPlatformTimesheetSnapshot.ISummary =
    await api.functional.hrmPlatform.admin.timesheet_snapshots.index(
      adminConnection,
      {
        body: {
          status: "submitted",
          limit: 100,
        } satisfies IHrmPlatformTimesheetSnapshot.IRequest,
      },
    );
  typia.assert(submittedFilter);
  TestValidator.predicate(
    "submitted filter returns only submitted snapshots",
    submittedFilter.data.every((snap) => snap.status === "submitted"),
  );
  // 5. Test filtering by status: rejected
  const rejectedFilter: IPageIHrmPlatformTimesheetSnapshot.ISummary =
    await api.functional.hrmPlatform.admin.timesheet_snapshots.index(
      adminConnection,
      {
        body: {
          status: "rejected",
          limit: 100,
        } satisfies IHrmPlatformTimesheetSnapshot.IRequest,
      },
    );
  typia.assert(rejectedFilter);
  TestValidator.predicate(
    "rejected filter returns only rejected snapshots",
    rejectedFilter.data.every((snap) => snap.status === "rejected"),
  );
  // 6. Test filtering by status: draft
  const draftFilter: IPageIHrmPlatformTimesheetSnapshot.ISummary =
    await api.functional.hrmPlatform.admin.timesheet_snapshots.index(
      adminConnection,
      {
        body: {
          status: "draft",
          limit: 100,
        } satisfies IHrmPlatformTimesheetSnapshot.IRequest,
      },
    );
  typia.assert(draftFilter);
  TestValidator.predicate(
    "draft filter returns only draft snapshots",
    draftFilter.data.every((snap) => snap.status === "draft"),
  );
  // 7. Test filtering by week_start_date range
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const weekRangeFilter: IPageIHrmPlatformTimesheetSnapshot.ISummary =
    await api.functional.hrmPlatform.admin.timesheet_snapshots.index(
      adminConnection,
      {
        body: {
          week_start_date_from: twoWeeksAgo.toISOString(),
          week_start_date_to: oneWeekAgo.toISOString(),
          limit: 100,
        } satisfies IHrmPlatformTimesheetSnapshot.IRequest,
      },
    );
  typia.assert(weekRangeFilter);
  TestValidator.predicate(
    "week_start_date range filter returns snapshots within range",
    weekRangeFilter.data.every(
      (snap) =>
        new Date(snap.week_start_date) >= twoWeeksAgo &&
        new Date(snap.week_start_date) <= oneWeekAgo,
    ),
  );
  // 8. Test filtering by submitted_at range
  const submittedRangeFilter: IPageIHrmPlatformTimesheetSnapshot.ISummary =
    await api.functional.hrmPlatform.admin.timesheet_snapshots.index(
      adminConnection,
      {
        body: {
          submitted_at_from: twoWeeksAgo.toISOString(),
          submitted_at_to: oneWeekAgo.toISOString(),
          limit: 100,
        } satisfies IHrmPlatformTimesheetSnapshot.IRequest,
      },
    );
  typia.assert(submittedRangeFilter);
  TestValidator.predicate(
    "submitted_at range filter returns snapshots submitted within range",
    submittedRangeFilter.data.every(
      (snap) =>
        snap.submitted_at !== null &&
        new Date(snap.submitted_at) >= twoWeeksAgo &&
        new Date(snap.submitted_at) <= oneWeekAgo,
    ),
  );
  // 9. Test filtering by approved_at range
  const approvedRangeFilter: IPageIHrmPlatformTimesheetSnapshot.ISummary =
    await api.functional.hrmPlatform.admin.timesheet_snapshots.index(
      adminConnection,
      {
        body: {
          approved_at_from: twoWeeksAgo.toISOString(),
          approved_at_to: oneWeekAgo.toISOString(),
          limit: 100,
        } satisfies IHrmPlatformTimesheetSnapshot.IRequest,
      },
    );
  typia.assert(approvedRangeFilter);
  TestValidator.predicate(
    "approved_at range filter returns snapshots approved within range",
    approvedRangeFilter.data.every(
      (snap) =>
        snap.approved_at !== null &&
        new Date(snap.approved_at) >= twoWeeksAgo &&
        new Date(snap.approved_at) <= oneWeekAgo,
    ),
  );
  // 10. Test filtering by rejected_at range
  const rejectedRangeFilter: IPageIHrmPlatformTimesheetSnapshot.ISummary =
    await api.functional.hrmPlatform.admin.timesheet_snapshots.index(
      adminConnection,
      {
        body: {
          rejected_at_from: twoWeeksAgo.toISOString(),
          rejected_at_to: oneWeekAgo.toISOString(),
          limit: 100,
        } satisfies IHrmPlatformTimesheetSnapshot.IRequest,
      },
    );
  typia.assert(rejectedRangeFilter);
  TestValidator.predicate(
    "rejected_at range filter returns snapshots rejected within range",
    rejectedRangeFilter.data.every(
      (snap) =>
        snap.rejected_at !== null &&
        new Date(snap.rejected_at) >= twoWeeksAgo &&
        new Date(snap.rejected_at) <= oneWeekAgo,
    ),
  );
  // 11. Test combined filters: status + date range
  const combinedFilter: IPageIHrmPlatformTimesheetSnapshot.ISummary =
    await api.functional.hrmPlatform.admin.timesheet_snapshots.index(
      adminConnection,
      {
        body: {
          status: "approved",
          approved_at_from: twoWeeksAgo.toISOString(),
          approved_at_to: oneWeekAgo.toISOString(),
          limit: 100,
        } satisfies IHrmPlatformTimesheetSnapshot.IRequest,
      },
    );
  typia.assert(combinedFilter);
  TestValidator.predicate(
    "combined filter returns approved snapshots within date range",
    combinedFilter.data.every(
      (snap) =>
        snap.status === "approved" &&
        snap.approved_at !== null &&
        new Date(snap.approved_at) >= twoWeeksAgo &&
        new Date(snap.approved_at) <= oneWeekAgo,
    ),
  );
  // 12. Test invalid date range (to < from) - should return empty results
  const invalidRangeFilter: IPageIHrmPlatformTimesheetSnapshot.ISummary =
    await api.functional.hrmPlatform.admin.timesheet_snapshots.index(
      adminConnection,
      {
        body: {
          week_start_date_from: now.toISOString(),
          week_start_date_to: twoWeeksAgo.toISOString(),
          limit: 100,
        } satisfies IHrmPlatformTimesheetSnapshot.IRequest,
      },
    );
  typia.assert(invalidRangeFilter);
  TestValidator.predicate(
    "invalid date range returns empty results",
    invalidRangeFilter.data.length === 0,
  );
  // 13. Test pagination with filters
  const paginatedFilter: IPageIHrmPlatformTimesheetSnapshot.ISummary =
    await api.functional.hrmPlatform.admin.timesheet_snapshots.index(
      adminConnection,
      {
        body: {
          status: "submitted",
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformTimesheetSnapshot.IRequest,
      },
    );
  typia.assert(paginatedFilter);
  TestValidator.predicate(
    "pagination limit respected",
    paginatedFilter.data.length <= 10,
  );
  TestValidator.equals(
    "pagination current page is 1",
    paginatedFilter.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    paginatedFilter.pagination.limit,
    10,
  );
}
