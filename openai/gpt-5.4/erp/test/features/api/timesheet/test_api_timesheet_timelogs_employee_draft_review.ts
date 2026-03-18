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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimelog";
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

export async function test_api_timesheet_timelogs_employee_draft_review(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_employee_join(employeeConnection, {
    body: {
      href: "https://example.com/hrm/timesheets",
      referrer: "https://example.com/hrm",
    },
  });
  typia.assert(authorized);
  const now = new Date();
  const utcDay = now.getUTCDay();
  const diffToMonday = utcDay === 0 ? -6 : 1 - utcDay;
  const monday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + diffToMonday,
      0,
      0,
      0,
      0,
    ),
  );
  const weekStartDate = monday.toISOString();
  const timesheet =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: weekStartDate,
        },
      },
    );
  typia.assert(timesheet);
  const baselineTimesheetId = timesheet.id;
  const baselineOrganizationId = timesheet.organization.id;
  const baselineEmployeeId = timesheet.employee.id;
  const baselineWeekStartDate = timesheet.week_start_date;
  const baselineWeekEndDate = timesheet.week_end_date;
  const baselineStatus = timesheet.status;
  const baselineCreatedAt = timesheet.created_at;
  const baselineUpdatedAt = timesheet.updated_at;
  const baselineSubmittedAt = timesheet.submitted_at;
  const baselineReviewedAt = timesheet.reviewed_at;
  const baselineRejectionReason = timesheet.rejection_reason;
  const baselineIncludedIds = new Set(
    timesheet.timelogs.map((timelog) => timelog.id),
  );
  const requestBody = {
    worked_from: timesheet.week_start_date,
    worked_to: timesheet.week_end_date,
    page: 1,
    limit: 100,
  } satisfies IHrmTimeTrackingTimelog.IRequest;
  const page =
    await api.functional.hrmTimeTracking.employee.timesheets.timelogs.index(
      employeeConnection,
      {
        timesheetId: timesheet.id,
        body: requestBody,
      },
    );
  typia.assert(page);
  TestValidator.equals(
    "current page matches request",
    page.pagination.current,
    1,
  );
  TestValidator.equals(
    "page limit matches request",
    page.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "record count is non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page count is non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "returned data length does not exceed requested limit",
    page.data.length <= requestBody.limit,
  );
  const timesheetWeekStart = new Date(timesheet.week_start_date).getTime();
  const timesheetWeekEnd = new Date(timesheet.week_end_date).getTime();
  for (const timelog of page.data) {
    TestValidator.equals(
      "timelog employee matches timesheet employee",
      timelog.employee.id,
      timesheet.employee.id,
    );
    TestValidator.equals(
      "timelog project organization matches timesheet organization",
      timelog.project.organization.id,
      timesheet.organization.id,
    );
    TestValidator.predicate(
      "timelog worked_on is within the timesheet week",
      (() => {
        const workedOn = new Date(timelog.worked_on).getTime();
        return workedOn >= timesheetWeekStart && workedOn <= timesheetWeekEnd;
      })(),
    );
    TestValidator.predicate(
      "timelog duration is non-negative",
      timelog.duration_minutes >= 0,
    );
    TestValidator.predicate(
      "returned timelog belongs to created timesheet composition",
      baselineIncludedIds.has(timelog.id),
    );
    TestValidator.predicate(
      "optional task is null or has an id",
      timelog.task === null || timelog.task.id.length > 0,
    );
  }
  TestValidator.equals(
    "timesheet id remains unchanged",
    timesheet.id,
    baselineTimesheetId,
  );
  TestValidator.equals(
    "timesheet organization remains unchanged",
    timesheet.organization.id,
    baselineOrganizationId,
  );
  TestValidator.equals(
    "timesheet employee remains unchanged",
    timesheet.employee.id,
    baselineEmployeeId,
  );
  TestValidator.equals(
    "timesheet week_start_date remains unchanged",
    timesheet.week_start_date,
    baselineWeekStartDate,
  );
  TestValidator.equals(
    "timesheet week_end_date remains unchanged",
    timesheet.week_end_date,
    baselineWeekEndDate,
  );
  TestValidator.equals(
    "timesheet status remains draft",
    timesheet.status,
    baselineStatus,
  );
  TestValidator.equals(
    "timesheet created_at remains unchanged",
    timesheet.created_at,
    baselineCreatedAt,
  );
  TestValidator.equals(
    "timesheet updated_at remains unchanged",
    timesheet.updated_at,
    baselineUpdatedAt,
  );
  TestValidator.equals(
    "timesheet submitted_at remains unchanged",
    timesheet.submitted_at,
    baselineSubmittedAt,
  );
  TestValidator.equals(
    "timesheet reviewed_at remains unchanged",
    timesheet.reviewed_at,
    baselineReviewedAt,
  );
  TestValidator.equals(
    "timesheet rejection_reason remains unchanged",
    timesheet.rejection_reason,
    baselineRejectionReason,
  );
  TestValidator.equals(
    "timesheet remains in draft status",
    timesheet.status,
    "draft",
  );
  TestValidator.equals(
    "timesheet submitted_at remains unset",
    timesheet.submitted_at,
    null,
  );
  TestValidator.equals(
    "timesheet reviewed_at remains unset",
    timesheet.reviewed_at,
    null,
  );
  TestValidator.equals(
    "timesheet rejection reason remains unset",
    timesheet.rejection_reason,
    null,
  );
  TestValidator.predicate(
    "returned timelog count does not exceed created timesheet composition",
    page.data.length <= timesheet.timelogs.length,
  );
}
