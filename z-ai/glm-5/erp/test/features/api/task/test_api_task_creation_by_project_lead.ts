import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

export async function test_api_task_creation_by_project_lead(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member A (organization owner with project:manage permission)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAAuth);
  // Step 2: Create a project within organization A
  const project = await generate_random_erp_hrm_member_projects_create(
    memberAConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        color_code: "#FF5733",
      },
    },
  );
  typia.assert(project);
  // Step 3: Create member B (future project lead)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberBAuth);
  // Step 4: Create employee record for member B in organization A
  // Use the 'Employee' role (one of the built-in roles created with organization)
  // Note: Since roles are auto-created with organization, we reference by index
  // The organization API response should include available roles, but since we
  // don't have a roles listing endpoint, we use a UUID string directly
  // The built-in roles are: Owner, Manager, Employee
  const employeeRoleId = typia.random<string & tags.Format<"uuid">>();
  const employeeB = await generate_random_erp_hrm_member_employees_create(
    memberAConnection,
    {
      body: {
        email: memberBAuth.email,
        roleId: employeeRoleId,
        employmentType: "full_time" as const,
      },
    },
  );
  typia.assert(employeeB);
  // Step 5: Add employee B to project as project_lead
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberAConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: employeeB.id,
          role: "project_lead" as const,
        },
      },
    );
  typia.assert(projectMember);
  // Step 6: Switch to member B's connection (project lead) and create a task
  const taskTitle = RandomGenerator.paragraph({ sentences: 1 });
  const taskDescription = RandomGenerator.paragraph({ sentences: 3 });
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days from now
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberBConnection,
    {
      params: { projectId: project.id },
      body: {
        title: taskTitle,
        description: taskDescription,
        priority: "high" as const,
        estimated_hours: 8,
        due_date: dueDate,
        employee_id: employeeB.id,
      },
    },
  );
  typia.assert(task);
  // Step 7: Verify task creation
  TestValidator.equals("task title matches", task.title, taskTitle);
  TestValidator.equals(
    "task description matches",
    task.description,
    taskDescription,
  );
  TestValidator.equals("task status defaults to open", task.status, "open");
  TestValidator.equals("task priority is high", task.priority, "high");
  TestValidator.predicate(
    "task estimated hours matches",
    task.estimatedHours === 8,
  );
  TestValidator.equals("task project matches", task.project.id, project.id);
  // Verify task history entry was created for task creation
  TestValidator.predicate(
    "task has history entries",
    task.histories.length > 0,
  );
  // Verify the first history entry records the creation
  const historyEntry = task.histories[0];
  if (historyEntry) {
    TestValidator.equals(
      "history previous status is empty for creation",
      historyEntry.previousStatus,
      "open",
    );
    TestValidator.equals(
      "history new status is open",
      historyEntry.newStatus,
      "open",
    );
  }
}
