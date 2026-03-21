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

export async function test_api_timesheet_approval_idempotent_behavior(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as manager by joining
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create project using utility function
  const project: IErpHrmProjectMember =
    await generate_random_erp_hrm_member_projects_create(memberConnection, {});
  typia.assert(project);
  // 3. Create task using utility function
  const task: IErpHrmTask =
    await generate_random_erp_hrm_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: project.id },
      },
    );
  typia.assert(task);
  // 4. Create timelog using utility function
  const timelog: IErpHrmTimelog =
    await generate_random_erp_hrm_member_timelogs_create(memberConnection, {
      body: {
        projectId: project.id,
        taskId: task.id,
      },
    });
  typia.assert(timelog);
  // 5. Create draft timesheet using utility function
  const timesheet: IErpHrmTimesheet =
    await generate_random_erp_hrm_member_timesheets_create(
      memberConnection,
      {},
    );
  typia.assert(timesheet);
  // 6. Add timelog to timesheet
  const updatedTimesheet: IErpHrmTimesheet =
    await api.functional.erpHrm.member.timesheets.timelogs.add(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: {
          erp_hrm_timelog_id: timelog.id,
        },
      },
    );
  typia.assert(updatedTimesheet);
  // 7. Submit timesheet
  const submittedTimesheet: IErpHrmTimesheet =
    await api.functional.erpHrm.member.timesheets.submit(memberConnection, {
      timesheetId: updatedTimesheet.id,
    });
  typia.assert(submittedTimesheet);
  // 8. Approve the timesheet for the first time - capture reviewed_at
  const firstApproval: IErpHrmTimesheet =
    await api.functional.erpHrm.member.timesheets.approve(memberConnection, {
      timesheetId: submittedTimesheet.id,
    });
  typia.assert(firstApproval);
  const originalReviewedAt = firstApproval.reviewed_at;
  const originalReviewerEmployeeId = firstApproval.reviewerEmployee?.id;
  // 9. Approve the same timesheet again (idempotent behavior)
  const secondApproval: IErpHrmTimesheet =
    await api.functional.erpHrm.member.timesheets.approve(memberConnection, {
      timesheetId: firstApproval.id,
    });
  typia.assert(secondApproval);
  // Validations
  TestValidator.equals(
    "reviewed_at timestamp remains unchanged",
    secondApproval.reviewed_at,
    originalReviewedAt,
  );
  TestValidator.equals(
    "reviewerEmployee ID remains the same",
    secondApproval.reviewerEmployee?.id,
    originalReviewerEmployeeId,
  );
  TestValidator.equals(
    "rejection_reason stays null",
    secondApproval.rejection_reason,
    null,
  );
  TestValidator.equals(
    "timesheet remains in approved status",
    secondApproval.status,
    "approved",
  );
}
