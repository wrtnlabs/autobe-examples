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
import { generate_random_hrm_time_tracking_projects_create } from "../../../generate/generate_random_hrm_time_tracking_projects_create";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timelog";
import { prepare_random_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet";
import { prepare_random_hrm_time_tracking_timesheet_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet_timelog";

export async function test_api_timesheet_timelog_add_submitted_blocked(
  connection: api.IConnection,
): Promise<void> {
  const employeeConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_employee_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!" satisfies string as string &
        tags.Format<"password">,
      href: "https://example.com/hrm/timesheets",
      referrer: "https://example.com/hrm",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackingEmployee.IJoin,
  });
  typia.assert(authorized);
  const now = new Date();
  const day = now.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
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
  const secondWorkedOn = new Date(monday);
  secondWorkedOn.setUTCDate(monday.getUTCDate() + 2);
  secondWorkedOn.setUTCHours(9, 0, 0, 0);
  const project = await generate_random_hrm_time_tracking_projects_create(
    employeeConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#3366cc",
        status: "active",
      },
    },
  );
  typia.assert(project);
  const initialTimelog =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      employeeConnection,
      {
        body: {
          hrmTimeTrackingProjectId: project.id,
          hrmTimeTrackingTaskId: undefined,
          workedOn: monday.toISOString(),
          durationMinutes: 60,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          billable: true,
        },
      },
    );
  typia.assert(initialTimelog);
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
    "draft status before submission",
    draftTimesheet.status,
    "draft",
  );
  TestValidator.predicate(
    "draft contains initially eligible timelog",
    ArrayUtil.has(
      draftTimesheet.timelogs,
      (timelog) => timelog.id === initialTimelog.id,
    ),
  );
  const submittedTimesheet =
    await api.functional.hrmTimeTracking.employee.timesheets.submit(
      employeeConnection,
      {
        timesheetId: draftTimesheet.id,
      },
    );
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "timesheet submitted status",
    submittedTimesheet.status,
    "submitted",
  );
  TestValidator.predicate(
    "submitted_at assigned on submit",
    submittedTimesheet.submitted_at !== null,
  );
  TestValidator.equals(
    "reviewed_at remains null on submit",
    submittedTimesheet.reviewed_at,
    null,
  );
  TestValidator.equals(
    "rejection reason remains null on submit",
    submittedTimesheet.rejection_reason,
    null,
  );
  TestValidator.predicate(
    "submitted snapshot still contains original timelog",
    ArrayUtil.has(
      submittedTimesheet.timelogs,
      (timelog) => timelog.id === initialTimelog.id,
    ),
  );
  const submittedTimelogIds = submittedTimesheet.timelogs.map(
    (timelog) => timelog.id,
  );
  const baselineSubmittedAt = submittedTimesheet.submitted_at;
  const baselineReviewedAt = submittedTimesheet.reviewed_at;
  const baselineRejectionReason = submittedTimesheet.rejection_reason;
  const newEligibleTimelog =
    await generate_random_hrm_time_tracking_employee_timelogs_create(
      employeeConnection,
      {
        body: {
          hrmTimeTrackingProjectId: project.id,
          hrmTimeTrackingTaskId: undefined,
          workedOn: secondWorkedOn.toISOString(),
          durationMinutes: 30,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          billable: false,
        },
      },
    );
  typia.assert(newEligibleTimelog);
  TestValidator.predicate(
    "new timelog not already included in submitted snapshot",
    submittedTimelogIds.includes(newEligibleTimelog.id) === false,
  );
  await TestValidator.error(
    "submitted timesheet blocks adding timelog",
    async () => {
      await generate_random_hrm_time_tracking_employee_timesheets_timelogs_create(
        employeeConnection,
        {
          params: {
            timesheetId: submittedTimesheet.id,
          },
          body: {
            hrm_time_tracking_timelog_id: newEligibleTimelog.id,
          },
        },
      );
    },
  );
  TestValidator.equals(
    "submitted status baseline preserved",
    submittedTimesheet.status,
    "submitted",
  );
  TestValidator.equals(
    "submitted_at baseline preserved",
    submittedTimesheet.submitted_at,
    baselineSubmittedAt,
  );
  TestValidator.equals(
    "reviewed_at baseline preserved",
    submittedTimesheet.reviewed_at,
    baselineReviewedAt,
  );
  TestValidator.equals(
    "rejection reason baseline preserved",
    submittedTimesheet.rejection_reason,
    baselineRejectionReason,
  );
  TestValidator.equals(
    "original timelog count unchanged in baseline snapshot",
    submittedTimesheet.timelogs.length,
    submittedTimelogIds.length,
  );
  TestValidator.predicate(
    "new timelog absent from submitted snapshot",
    ArrayUtil.has(
      submittedTimesheet.timelogs,
      (timelog) => timelog.id === newEligibleTimelog.id,
    ) === false,
  );
}
