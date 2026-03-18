import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import type { IHrmTimeTrackingTimesheetSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheetSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingTimesheetSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimesheetSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_employee_join } from "../../../authorize/authorize_employee_join";
import { authorize_employee_login } from "../../../authorize/authorize_employee_login";
import { authorize_employee_refresh } from "../../../authorize/authorize_employee_refresh";
import { generate_random_hrm_time_tracking_employee_timesheets_create } from "../../../generate/generate_random_hrm_time_tracking_employee_timesheets_create";
import { prepare_random_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet";

export async function test_api_timesheet_snapshot_history_pagination_and_sort(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/hrm/timesheets" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/hrm" satisfies string & tags.Format<"uri">,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingEmployee.IJoin,
  });
  const monday = new Date("2026-03-09T00:00:00.000Z");
  const timesheet =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: monday.toISOString(),
        } satisfies IHrmTimeTrackingTimesheet.ICreate,
      },
    );
  typia.assert(timesheet);
  const originalStatus = timesheet.status;
  const originalTotalHours = timesheet.total_hours;
  const originalSubmittedAt = timesheet.submitted_at;
  const originalReviewedAt = timesheet.reviewed_at;
  const originalRejectionReason = timesheet.rejection_reason;
  const ascRequest = {
    page: 1,
    limit: 10,
    sort: "+id",
  } satisfies IHrmTimeTrackingTimesheetSnapshot.IRequest;
  const ascPage =
    await api.functional.hrmTimeTracking.employee.timesheets.snapshots.index(
      employeeConnection,
      {
        timesheetId: timesheet.id,
        body: ascRequest,
      },
    );
  typia.assert(ascPage);
  TestValidator.equals(
    "ascending page echoes requested current page",
    ascPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "ascending page echoes requested limit",
    ascPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "ascending records non-negative",
    ascPage.pagination.records >= 0,
  );
  TestValidator.equals(
    "ascending data length stays within limit",
    ascPage.data.length <= ascPage.pagination.limit,
    true,
  );
  TestValidator.equals(
    "ascending pages consistent with records and limit",
    ascPage.pagination.pages,
    ascPage.pagination.records === 0
      ? 0
      : Math.ceil(ascPage.pagination.records / ascPage.pagination.limit),
  );
  const ascIds = ascPage.data.map((snapshot) => snapshot.id);
  TestValidator.equals(
    "ascending page contains unique snapshot ids",
    new Set(ascIds).size,
    ascIds.length,
  );
  const descRequest = {
    page: 1,
    limit: 10,
    sort: "-id",
  } satisfies IHrmTimeTrackingTimesheetSnapshot.IRequest;
  const descPage =
    await api.functional.hrmTimeTracking.employee.timesheets.snapshots.index(
      employeeConnection,
      {
        timesheetId: timesheet.id,
        body: descRequest,
      },
    );
  typia.assert(descPage);
  TestValidator.equals(
    "descending page echoes requested current page",
    descPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "descending page echoes requested limit",
    descPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "descending records non-negative",
    descPage.pagination.records >= 0,
  );
  TestValidator.equals(
    "descending data length stays within limit",
    descPage.data.length <= descPage.pagination.limit,
    true,
  );
  TestValidator.equals(
    "descending pages consistent with records and limit",
    descPage.pagination.pages,
    descPage.pagination.records === 0
      ? 0
      : Math.ceil(descPage.pagination.records / descPage.pagination.limit),
  );
  const descIds = descPage.data.map((snapshot) => snapshot.id);
  TestValidator.equals(
    "descending page contains unique snapshot ids",
    new Set(descIds).size,
    descIds.length,
  );
  TestValidator.equals(
    "sort direction does not change total matching snapshot records",
    descPage.pagination.records,
    ascPage.pagination.records,
  );
  TestValidator.equals(
    "sort direction does not change total page count for same limit",
    descPage.pagination.pages,
    ascPage.pagination.pages,
  );
  TestValidator.equals(
    "local parent object total_hours remains unchanged after read queries",
    timesheet.total_hours,
    originalTotalHours,
  );
  TestValidator.equals(
    "local parent object status remains unchanged after read queries",
    timesheet.status,
    originalStatus,
  );
  TestValidator.equals(
    "local parent object submitted_at remains unchanged after read queries",
    timesheet.submitted_at,
    originalSubmittedAt,
  );
  TestValidator.equals(
    "local parent object reviewed_at remains unchanged after read queries",
    timesheet.reviewed_at,
    originalReviewedAt,
  );
  TestValidator.equals(
    "local parent object rejection_reason remains unchanged after read queries",
    timesheet.rejection_reason,
    originalRejectionReason,
  );
  if (
    ascPage.data.length > 1 &&
    ascPage.data.length === descPage.data.length &&
    ascPage.pagination.current === descPage.pagination.current &&
    ascPage.pagination.limit === descPage.pagination.limit
  ) {
    TestValidator.equals(
      "descending ids reverse ascending ids for same page",
      descIds,
      [...ascIds].reverse(),
    );
  }
}
