import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOrganizationWeeklySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationWeeklySummary";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import type { IHrmTimeTrackingTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_employee_join } from "../../../authorize/authorize_employee_join";
import { authorize_employee_login } from "../../../authorize/authorize_employee_login";
import { authorize_employee_refresh } from "../../../authorize/authorize_employee_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_hrm_time_tracking_employee_timelogs_create } from "../../../generate/generate_random_hrm_time_tracking_employee_timelogs_create";
import { generate_random_hrm_time_tracking_employee_timesheets_create } from "../../../generate/generate_random_hrm_time_tracking_employee_timesheets_create";
import { generate_random_hrm_time_tracking_employee_timesheets_timelogs_create } from "../../../generate/generate_random_hrm_time_tracking_employee_timesheets_timelogs_create";
import { generate_random_hrm_time_tracking_owner_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_owner_organizations_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timelog";
import { prepare_random_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet";
import { prepare_random_hrm_time_tracking_timesheet_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet_timelog";

export async function test_api_organization_weekly_summary_detail_in_current_organization(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {});
  const organization: IHrmTimeTrackingOrganization =
    await generate_random_hrm_time_tracking_owner_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  const employeeConnection: api.IConnection = { host: connection.host };
  await authorize_employee_join(employeeConnection, {});
  const timelog: IHrmTimeTrackingTimelog =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      employeeConnection,
      {},
    );
  typia.assert(timelog);
  const workedOnDate: Date = new Date(timelog.worked_on);
  const dayOfWeek: number = workedOnDate.getUTCDay();
  const mondayOffset: number = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart: Date = new Date(workedOnDate);
  weekStart.setUTCDate(workedOnDate.getUTCDate() + mondayOffset);
  weekStart.setUTCHours(0, 0, 0, 0);
  const timesheet: IHrmTimeTrackingTimesheet =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: weekStart.toISOString(),
        },
      },
    );
  typia.assert(timesheet);
  const includedAlready: boolean = ArrayUtil.has(
    timesheet.timelogs,
    (entry) => entry.id === timelog.id,
  );
  const attachedTimesheet: IHrmTimeTrackingTimesheet = includedAlready
    ? timesheet
    : await generate_random_hrm_time_tracking_employee_timesheets_timelogs_create(
        employeeConnection,
        {
          params: {
            timesheetId: timesheet.id,
          },
          body: {
            hrm_time_tracking_timelog_id: timelog.id,
          },
        },
      );
  typia.assert(attachedTimesheet);
  TestValidator.predicate(
    "timelog included in timesheet",
    ArrayUtil.has(
      attachedTimesheet.timelogs,
      (entry) => entry.id === timelog.id,
    ),
  );
  const submitted: IHrmTimeTrackingTimesheet =
    await api.functional.hrmTimeTracking.employee.timesheets.submit(
      employeeConnection,
      {
        timesheetId: attachedTimesheet.id,
      },
    );
  typia.assert(submitted);
  TestValidator.equals(
    "timesheet submitted status",
    submitted.status,
    "submitted",
  );
  TestValidator.equals(
    "submitted timesheet week start preserved",
    submitted.week_start_date,
    attachedTimesheet.week_start_date,
  );
  TestValidator.equals(
    "submitted timesheet week end preserved",
    submitted.week_end_date,
    attachedTimesheet.week_end_date,
  );
  TestValidator.predicate(
    "submitted timesheet still includes created timelog",
    ArrayUtil.has(submitted.timelogs, (entry) => entry.id === timelog.id),
  );
  await TestValidator.httpError(
    "weekly summary detail cannot be resolved from available setup because no organization weekly summary id source is provided",
    [400, 404, 422],
    async () => {
      await api.functional.hrmTimeTracking.organizationWeeklySummaries.at(
        ownerConnection,
        {
          organizationWeeklySummaryId: submitted.id,
        },
      );
    },
  );
}
