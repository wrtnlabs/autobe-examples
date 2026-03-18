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

export async function test_api_timesheet_timelogs_filter_empty_page(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/hrm/timesheets",
      referrer: "https://example.com/hrm",
    },
  });
  typia.assert(authorized);
  const monday = new Date("2024-01-01T00:00:00.000Z");
  const timesheet =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: monday.toISOString(),
        },
      },
    );
  typia.assert(timesheet);
  const beforeId = timesheet.id;
  const beforeStatus = timesheet.status;
  const beforeTimelogCount = timesheet.timelogs.length;
  const beforeTotalHours = timesheet.total_hours;
  const beforeSubmittedAt = timesheet.submitted_at;
  const beforeReviewedAt = timesheet.reviewed_at;
  const beforeRejectionReason = timesheet.rejection_reason;
  const beforeWeekStartDate = timesheet.week_start_date;
  const beforeWeekEndDate = timesheet.week_end_date;
  const request = {
    search: `no-match-${RandomGenerator.alphaNumeric(16)}-${Date.now()}`,
    page: 1,
    limit: 10,
  } satisfies IHrmTimeTrackingTimelog.IRequest;
  const page =
    await api.functional.hrmTimeTracking.employee.timesheets.timelogs.index(
      employeeConnection,
      {
        timesheetId: timesheet.id,
        body: request,
      },
    );
  typia.assert(page);
  TestValidator.equals(
    "current page is preserved",
    page.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "limit is preserved",
    page.pagination.limit,
    request.limit,
  );
  TestValidator.equals(
    "empty filtered result has no rows",
    page.data.length,
    0,
  );
  TestValidator.equals(
    "empty filtered result has zero records",
    page.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty filtered result has zero pages",
    page.pagination.pages,
    0,
  );
  TestValidator.equals("timesheet id is unchanged", timesheet.id, beforeId);
  TestValidator.equals(
    "timesheet status is unchanged",
    timesheet.status,
    beforeStatus,
  );
  TestValidator.equals(
    "timesheet timelog count is unchanged",
    timesheet.timelogs.length,
    beforeTimelogCount,
  );
  TestValidator.equals(
    "timesheet total hours is unchanged",
    timesheet.total_hours,
    beforeTotalHours,
  );
  TestValidator.equals(
    "timesheet submitted_at is unchanged",
    timesheet.submitted_at,
    beforeSubmittedAt,
  );
  TestValidator.equals(
    "timesheet reviewed_at is unchanged",
    timesheet.reviewed_at,
    beforeReviewedAt,
  );
  TestValidator.equals(
    "timesheet rejection_reason is unchanged",
    timesheet.rejection_reason,
    beforeRejectionReason,
  );
  TestValidator.equals(
    "timesheet week_start_date is unchanged",
    timesheet.week_start_date,
    beforeWeekStartDate,
  );
  TestValidator.equals(
    "timesheet week_end_date is unchanged",
    timesheet.week_end_date,
    beforeWeekEndDate,
  );
}
