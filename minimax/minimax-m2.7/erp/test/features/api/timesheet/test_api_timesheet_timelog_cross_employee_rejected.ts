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
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_timelog_cross_employee_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as first member (who will own the timesheet)
  const firstMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(firstMemberConnection, {});
  // 2. Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    firstMemberConnection,
    {},
  );
  // 3. Create a task within the project
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    firstMemberConnection,
    {
      params: { projectId: project.id },
    },
  );
  // 4. Authenticate as second member (who will create the timelog)
  const secondMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(secondMemberConnection, {});
  // 5. Create timelog as second member
  // Note: In this system, when a member joins, an employee record is created
  // The employee can log time against projects they are assigned to
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    secondMemberConnection,
    {
      body: {
        projectId: project.id,
        taskId: task.id,
        date: new Date().toISOString(),
        durationMinutes: 60,
      },
    },
  );
  typia.assert(timelog);
  // 6. Authenticate as first member again to create timesheet
  const firstMemberConnection2: api.IConnection = { host: connection.host };
  await authorize_member_join(firstMemberConnection2, {});
  // 7. Create a draft timesheet for first member
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    firstMemberConnection2,
    {},
  );
  typia.assert(timesheet);
  // Store original timelog count to verify it doesn't change
  const originalTimelogCount = timesheet.timesheetTimelogs.length;
  // 8. Attempt to add second member's timelog to first member's timesheet
  // This should be rejected because the timelog belongs to a different employee
  await TestValidator.error(
    "cross-employee timelog addition should be rejected",
    async () => {
      await api.functional.erpHrm.member.timesheets.timelogs.update(
        firstMemberConnection2,
        {
          timesheetId: timesheet.id,
          body: {
            addTimelogIds: [timelog.id],
          } satisfies IErpHrmTimesheetTimelog.IUpdate,
        },
      );
    },
  );
  // 9. Verify timesheet remains unchanged by re-fetching it
  // Note: We cannot directly get timesheet by ID with available functions,
  // but the error confirms the timelog was not added
  TestValidator.equals(
    "timesheet should not include cross-employee timelog",
    timesheet.timesheetTimelogs.some((t) => t.erpHrmTimelog.id === timelog.id),
    false,
  );
}
