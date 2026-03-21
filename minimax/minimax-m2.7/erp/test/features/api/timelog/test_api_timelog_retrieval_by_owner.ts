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

export async function test_api_timelog_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      displayName: "Test Member",
      href: "https://example.com/register",
      referrer: "https://google.com",
    },
  });
  // 2. Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Test Project",
        color: "#FF5733",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 3. Create a task within the project
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: "Test Task",
        priority: "medium",
      },
    },
  );
  typia.assert(task);
  // 4. Create a timelog with task association
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        taskId: task.id,
        date: new Date().toISOString(),
        durationMinutes: 120,
        description: "Test timelog description",
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  // 5. Retrieve the timelog by ID
  const retrieved = await api.functional.erpHrm.member.timelogs.at(
    memberConnection,
    {
      timelogId: timelog.id,
    },
  );
  typia.assert(retrieved);
  // 6. Validate the retrieved timelog
  TestValidator.equals("timelog ID matches", retrieved.id, timelog.id);
  TestValidator.equals("date matches", retrieved.date, timelog.date);
  TestValidator.equals(
    "duration_minutes matches",
    retrieved.duration_minutes,
    timelog.duration_minutes,
  );
  TestValidator.equals(
    "description matches",
    retrieved.description,
    timelog.description,
  );
  TestValidator.equals(
    "billable status matches",
    retrieved.billable,
    timelog.billable,
  );
  // Validate nested employee summary
  TestValidator.predicate("employee summary exists", !!retrieved.employee);
  TestValidator.equals(
    "employee id matches",
    retrieved.employee.id,
    timelog.employee.id,
  );
  TestValidator.predicate(
    "employee position exists",
    !!retrieved.employee.position,
  );
  TestValidator.predicate(
    "employee status exists",
    !!retrieved.employee.status,
  );
  // Validate nested project summary
  TestValidator.predicate("project summary exists", !!retrieved.project);
  TestValidator.equals("project id matches", retrieved.project.id, project.id);
  TestValidator.equals(
    "project name matches",
    retrieved.project.name,
    project.name,
  );
  TestValidator.equals(
    "project color matches",
    retrieved.project.color,
    project.color,
  );
  TestValidator.equals(
    "project status matches",
    retrieved.project.status,
    project.status,
  );
  // Validate nested task summary
  TestValidator.predicate("task summary exists", !!retrieved.task);
  TestValidator.equals("task id matches", retrieved.task!.id, task.id);
  TestValidator.equals("task title matches", retrieved.task!.title, task.title);
  TestValidator.equals(
    "task status matches",
    retrieved.task!.status,
    task.status,
  );
  TestValidator.equals(
    "task priority matches",
    retrieved.task!.priority,
    task.priority,
  );
  // Validate timestamps
  TestValidator.predicate("created_at exists", !!retrieved.created_at);
  TestValidator.predicate("updated_at exists", !!retrieved.updated_at);
}
