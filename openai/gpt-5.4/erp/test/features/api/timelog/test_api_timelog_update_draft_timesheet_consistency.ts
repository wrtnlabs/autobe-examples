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
import { generate_random_hrm_time_tracking_projects_create } from "../../../generate/generate_random_hrm_time_tracking_projects_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timelog";
import { prepare_random_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet";

export async function test_api_timelog_update_draft_timesheet_consistency(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/hrm/timelogs",
      referrer: "https://example.com/hrm",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const monday = new Date("2026-03-09T00:00:00.000Z");
  const workedOn = new Date("2026-03-12T09:00:00.000Z").toISOString();
  const project = await generate_random_hrm_time_tracking_projects_create(
    employeeConnection,
    {
      body: {
        name: `project-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#33AA55",
        status: "active",
        budget_hours: 40,
        start_date: monday.toISOString(),
        end_date: null,
      },
    },
  );
  typia.assert(project);
  const createdTimelog =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      employeeConnection,
      {
        body: {
          hrmTimeTrackingProjectId: project.id,
          hrmTimeTrackingTaskId: null,
          workedOn,
          durationMinutes: 90,
          description: "Initial draft timelog description",
          billable: false,
        },
      },
    );
  typia.assert(createdTimelog);
  const draftTimesheet =
    await generate_random_hrm_time_tracking_employee_timesheets_create(
      employeeConnection,
      {
        body: {
          week_start_date: monday.toISOString(),
        },
      },
    );
  typia.assert(draftTimesheet);
  TestValidator.equals(
    "timesheet status is draft",
    draftTimesheet.status,
    "draft",
  );
  TestValidator.equals(
    "timesheet employee matches authorized employee",
    draftTimesheet.employee.id,
    authorized.id,
  );
  TestValidator.equals(
    "timesheet includes created timelog",
    ArrayUtil.has(draftTimesheet.timelogs, (tl) => tl.id === createdTimelog.id),
    true,
  );
  TestValidator.equals(
    "draft total hours reflects included timelogs",
    draftTimesheet.total_hours,
    draftTimesheet.timelogs.reduce((sum, tl) => sum + tl.duration_minutes, 0) /
      60,
  );
  TestValidator.predicate("target timelog exists in draft snapshot", () =>
    draftTimesheet.timelogs.some((tl) => tl.id === createdTimelog.id),
  );
  const originalIncludedTimelog = draftTimesheet.timelogs.find(
    (tl) => tl.id === createdTimelog.id,
  );
  if (originalIncludedTimelog === undefined)
    throw new Error("Target timelog was not included in the draft timesheet");
  const updateBody = {
    hrm_time_tracking_project_id: project.id,
    hrm_time_tracking_task_id: null,
    worked_on: new Date("2026-03-13T15:30:00.000Z").toISOString(),
    duration_minutes: 135,
    description: "Updated while draft timesheet remains editable",
    billable: true,
  } satisfies IHrmTimeTrackingTimelog.IUpdate;
  const updatedTimelog =
    await api.functional.hrmTimeTracking.employee.timelogs.update(
      employeeConnection,
      {
        timelogId: createdTimelog.id,
        body: updateBody,
      },
    );
  typia.assert(updatedTimelog);
  TestValidator.equals(
    "updated timelog id is unchanged",
    updatedTimelog.id,
    createdTimelog.id,
  );
  TestValidator.equals(
    "updated timelog organization unchanged",
    updatedTimelog.organization.id,
    createdTimelog.organization.id,
  );
  TestValidator.equals(
    "updated timelog employee unchanged",
    updatedTimelog.employee.id,
    createdTimelog.employee.id,
  );
  TestValidator.equals(
    "updated timelog project unchanged",
    updatedTimelog.project.id,
    project.id,
  );
  TestValidator.equals(
    "updated duration applied",
    updatedTimelog.duration_minutes,
    updateBody.duration_minutes,
  );
  TestValidator.equals(
    "updated description applied",
    updatedTimelog.description,
    updateBody.description,
  );
  TestValidator.equals(
    "updated billable applied",
    updatedTimelog.billable,
    updateBody.billable,
  );
  TestValidator.equals(
    "updated worked_on applied",
    updatedTimelog.worked_on,
    updateBody.worked_on,
  );
  TestValidator.equals(
    "updated timelog organization matches draft timesheet organization",
    updatedTimelog.organization.id,
    draftTimesheet.organization.id,
  );
  TestValidator.equals(
    "updated timelog employee matches draft timesheet employee",
    updatedTimelog.employee.id,
    draftTimesheet.employee.id,
  );
  const updatedWorkedOnTime = new Date(updatedTimelog.worked_on).getTime();
  const weekStartTime = new Date(draftTimesheet.week_start_date).getTime();
  const weekEndTime = new Date(draftTimesheet.week_end_date).getTime();
  TestValidator.predicate(
    "updated timelog remains inside the draft week",
    updatedWorkedOnTime >= weekStartTime && updatedWorkedOnTime <= weekEndTime,
  );
  const expectedRecalculatedTotalHours =
    draftTimesheet.total_hours -
    originalIncludedTimelog.duration_minutes / 60 +
    updatedTimelog.duration_minutes / 60;
  TestValidator.predicate(
    "expected recalculated draft total is positive",
    expectedRecalculatedTotalHours > 0,
  );
  TestValidator.notEquals(
    "draft total would change after duration update",
    expectedRecalculatedTotalHours,
    draftTimesheet.total_hours,
  );
}
