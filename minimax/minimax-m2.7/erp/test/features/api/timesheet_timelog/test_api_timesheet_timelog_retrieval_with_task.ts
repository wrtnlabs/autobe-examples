import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import type { IErpHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_timelog_retrieval_with_task(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // Step 2: Create project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#FF5733" satisfies string & tags.Pattern<"^#[0-9A-Fa-f]{6}$">,
        status: "active",
      },
    },
  );
  typia.assert(project);
  // Step 3: Create task within project
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        priority: RandomGenerator.pick([
          "low",
          "medium",
          "high",
          "urgent",
        ] as const),
        status: "open",
      },
    },
  );
  typia.assert(task);
  // Step 4: Create timelog with task assignment
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        taskId: task.id,
        date: new Date().toISOString(),
        durationMinutes: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  // Step 5: Create timesheet for work week
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: monday.toISOString(),
        week_end_date: sunday.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // Step 6: Add timelog to timesheet (if not already auto-included)
  const existingTimelog = timesheet.timesheetTimelogs.find(
    (st) => st.erpHrmTimelog.id === timelog.id,
  );
  if (!existingTimelog) {
    const updatedTimesheet =
      await api.functional.erpHrm.member.timesheets.timelogs.add(
        memberConnection,
        {
          timesheetId: timesheet.id,
          body: {
            erp_hrm_timelog_id: timelog.id,
          } satisfies IErpHrmTimesheetTimelog.IAddRequest,
        },
      );
    typia.assert(updatedTimesheet);
  }
  // Step 7: Retrieve the timesheet-timelog association
  const timesheetTimelogId = timesheet.timesheetTimelogs.find(
    (st) => st.erpHrmTimelog.id === timelog.id,
  )?.id;
  if (!timesheetTimelogId) {
    throw new Error("Timelog was not associated with timesheet");
  }
  const association = await api.functional.erpHrm.member.timesheets.timelogs.at(
    memberConnection,
    {
      timesheetId: timesheet.id,
      timesheetTimelogId: timesheetTimelogId,
    },
  );
  typia.assert(association);
  // Validate: Response includes erpHrmTask field with task summary
  TestValidator.equals(
    "erpHrmTask exists",
    association.erpHrmTask !== null && association.erpHrmTask !== undefined,
    true,
  );
  TestValidator.equals(
    "task title matches",
    association.erpHrmTask!.title,
    task.title,
  );
  TestValidator.equals(
    "task status matches",
    association.erpHrmTask!.status,
    task.status,
  );
  TestValidator.equals(
    "task priority matches",
    association.erpHrmTask!.priority,
    task.priority,
  );
}
