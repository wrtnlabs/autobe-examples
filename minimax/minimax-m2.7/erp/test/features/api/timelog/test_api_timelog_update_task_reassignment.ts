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
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_timelog_update_task_reassignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // 2. Create project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#FF5733",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 3. Create first task
  const firstTask = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: `Task 1: ${RandomGenerator.paragraph({ sentences: 1 })}`,
        priority: "medium",
        status: "open",
      },
    },
  );
  typia.assert(firstTask);
  // 4. Create second task
  const secondTask = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: `Task 2: ${RandomGenerator.paragraph({ sentences: 1 })}`,
        priority: "high",
        status: "open",
      },
    },
  );
  typia.assert(secondTask);
  // 5. Create timelog with first task
  const timelogDate = new Date().toISOString();
  const timelogDuration = 60;
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        taskId: firstTask.id,
        date: timelogDate,
        durationMinutes: timelogDuration,
        description: "Initial timelog on first task",
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  // Store original values for validation
  const originalDate = timelog.date;
  const originalDuration = timelog.duration_minutes;
  const originalDescription = timelog.description;
  const originalBillable = timelog.billable;
  const originalProjectId = timelog.project.id;
  // 6. Update timelog - reassign to second task
  const updatedTimelog = await api.functional.erpHrm.member.timelogs.update(
    memberConnection,
    {
      timelogId: timelog.id,
      body: {
        task_id: secondTask.id,
      },
    },
  );
  typia.assert(updatedTimelog);
  // 7. Verify timelog is now associated with second task
  TestValidator.equals(
    "task reassigned",
    updatedTimelog.task?.id,
    secondTask.id,
  );
  // 8. Verify project association remains the same
  TestValidator.equals(
    "project unchanged",
    updatedTimelog.project.id,
    originalProjectId,
  );
  TestValidator.equals(
    "project name unchanged",
    updatedTimelog.project.name,
    project.name,
  );
  // 9. Verify other fields unchanged
  TestValidator.equals("date unchanged", updatedTimelog.date, originalDate);
  TestValidator.equals(
    "duration unchanged",
    updatedTimelog.duration_minutes,
    originalDuration,
  );
  TestValidator.equals(
    "description unchanged",
    updatedTimelog.description,
    originalDescription,
  );
  TestValidator.equals(
    "billable unchanged",
    updatedTimelog.billable,
    originalBillable,
  );
}
