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
import type { IHrmTimeTrackingTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_employee_join } from "../../../authorize/authorize_employee_join";
import { authorize_employee_login } from "../../../authorize/authorize_employee_login";
import { authorize_employee_refresh } from "../../../authorize/authorize_employee_refresh";
import { generate_random_hrm_time_tracking_employee_timelogs_create } from "../../../generate/generate_random_hrm_time_tracking_employee_timelogs_create";
import { generate_random_hrm_time_tracking_employee_timesheets_create } from "../../../generate/generate_random_hrm_time_tracking_employee_timesheets_create";
import { generate_random_hrm_time_tracking_employee_timesheets_timelogs_create } from "../../../generate/generate_random_hrm_time_tracking_employee_timesheets_timelogs_create";
import { prepare_random_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timelog";
import { prepare_random_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet";
import { prepare_random_hrm_time_tracking_timesheet_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet_timelog";

export async function test_api_timesheet_submit_with_included_timelogs(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string as string &
        tags.Format<"password">,
      href: "https://example.com/hrm/timesheets/join",
      referrer: "https://example.com/hrm/timesheets",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingEmployee.IJoin,
  });
  typia.assert(employee);
  const weekStartDate = "2026-03-09T00:00:00.000Z";
  const workedOn = "2026-03-11T09:00:00.000Z";
  const draftTimesheet =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: weekStartDate,
        } satisfies IHrmTimeTrackingTimesheet.ICreate,
      },
    );
  typia.assert(draftTimesheet);
  TestValidator.equals(
    "draft timesheet status before submission",
    draftTimesheet.status,
    "draft",
  );
  TestValidator.equals(
    "draft timesheet submitted_at before submission",
    draftTimesheet.submitted_at,
    null,
  );
  TestValidator.equals(
    "draft timesheet reviewed_at before submission",
    draftTimesheet.reviewed_at,
    null,
  );
  TestValidator.equals(
    "draft timesheet rejection_reason before submission",
    draftTimesheet.rejection_reason,
    null,
  );
  TestValidator.equals(
    "draft timesheet owner before submission",
    draftTimesheet.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "draft timesheet total_hours derived before manual inclusion",
    draftTimesheet.total_hours,
    draftTimesheet.timelogs.reduce(
      (sum, timelog) => sum + timelog.duration_minutes,
      0,
    ) / 60,
  );
  const timelog =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      employeeConnection,
      {
        body: {
          workedOn,
          durationMinutes: 135,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          billable: true,
        },
      },
    );
  typia.assert(timelog);
  TestValidator.equals(
    "created timelog belongs to employee",
    timelog.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "created timelog organization matches draft timesheet organization",
    timelog.organization.id,
    draftTimesheet.organization.id,
  );
  const attachedTimesheet =
    await generate_random_hrm_time_tracking_employee_timesheets_timelogs_create(
      employeeConnection,
      {
        params: {
          timesheetId: draftTimesheet.id,
        },
        body: {
          hrm_time_tracking_timelog_id: timelog.id,
        } satisfies IHrmTimeTrackingTimesheetTimelog.ICreate,
      },
    );
  typia.assert(attachedTimesheet);
  TestValidator.equals(
    "attached timesheet still owned by employee",
    attachedTimesheet.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "attached timesheet organization unchanged",
    attachedTimesheet.organization.id,
    draftTimesheet.organization.id,
  );
  TestValidator.predicate(
    "attached timesheet contains created timelog",
    ArrayUtil.has(
      attachedTimesheet.timelogs,
      (included) => included.id === timelog.id,
    ),
  );
  TestValidator.equals(
    "attached timesheet total_hours derived from included timelogs",
    attachedTimesheet.total_hours,
    attachedTimesheet.timelogs.reduce(
      (sum, included) => sum + included.duration_minutes,
      0,
    ) / 60,
  );
  const submitted =
    await api.functional.hrmTimeTracking.employee.timesheets.submit(
      employeeConnection,
      {
        timesheetId: attachedTimesheet.id,
      },
    );
  typia.assert(submitted);
  TestValidator.equals(
    "submitted timesheet id unchanged",
    submitted.id,
    draftTimesheet.id,
  );
  TestValidator.equals(
    "submitted timesheet status",
    submitted.status,
    "submitted",
  );
  TestValidator.predicate(
    "submitted_at populated on submission",
    submitted.submitted_at !== null,
  );
  TestValidator.equals(
    "reviewed_at remains null on submission",
    submitted.reviewed_at,
    null,
  );
  TestValidator.equals(
    "rejection_reason remains null on submission",
    submitted.rejection_reason,
    null,
  );
  TestValidator.equals(
    "submitted timesheet owner preserved",
    submitted.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "submitted timesheet organization preserved",
    submitted.organization.id,
    draftTimesheet.organization.id,
  );
  TestValidator.predicate(
    "submitted timesheet preserves included timelog",
    ArrayUtil.has(submitted.timelogs, (included) => included.id === timelog.id),
  );
  TestValidator.equals(
    "submitted timesheet total_hours recalculated from returned timelogs",
    submitted.total_hours,
    submitted.timelogs.reduce(
      (sum, included) => sum + included.duration_minutes,
      0,
    ) / 60,
  );
}
