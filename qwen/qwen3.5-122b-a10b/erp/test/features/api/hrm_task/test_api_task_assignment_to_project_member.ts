import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMember";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTaskHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_projects_create } from "../../../generate/generate_random_hrm_member_organizations_projects_create";
import { generate_random_hrm_member_organizations_projects_tasks_create } from "../../../generate/generate_random_hrm_member_organizations_projects_tasks_create";
import { generate_random_hrm_member_projects_members_create } from "../../../generate/generate_random_hrm_member_projects_members_create";
import { prepare_random_hrm_project } from "../../../prepare/prepare_random_hrm_project";
import { prepare_random_hrm_project_member } from "../../../prepare/prepare_random_hrm_project_member";
import { prepare_random_hrm_task } from "../../../prepare/prepare_random_hrm_task";

export async function test_api_task_assignment_to_project_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two member accounts for project-lead and member roles
  const leadConnection: api.IConnection = { host: connection.host };
  const leadAuth = await authorize_member_join(leadConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(leadAuth);
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization context - use organization ID from path parameter
  // Note: Organization creation utility not available in provided materials
  // In simulation mode, random UUID will be accepted
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create a project in the organization using project-lead connection
  const project =
    await generate_random_hrm_member_organizations_projects_create(
      leadConnection,
      {
        params: { organizationId },
      },
    );
  typia.assert(project);
  // 4. Create employee records for both members
  // Note: Employee creation utility not available in provided materials
  // Using random UUIDs for simulation mode compatibility
  const leadEmployeeId = typia.random<string & tags.Format<"uuid">>();
  const memberEmployeeId = typia.random<string & tags.Format<"uuid">>();
  // 5. Assign first employee as project-lead to the project
  const leadMember = await generate_random_hrm_member_projects_members_create(
    leadConnection,
    {
      body: {
        employee_id: leadEmployeeId,
        role: "project-lead",
      } satisfies IHrmProjectMember.ICreate,
      params: { projectId: project.id },
    },
  );
  typia.assert(leadMember);
  TestValidator.equals(
    "lead member role is project-lead",
    leadMember.role,
    "project-lead",
  );
  // 6. Assign second employee as regular member to the project
  const memberMember = await generate_random_hrm_member_projects_members_create(
    leadConnection,
    {
      body: {
        employee_id: memberEmployeeId,
        role: "member",
      } satisfies IHrmProjectMember.ICreate,
      params: { projectId: project.id },
    },
  );
  typia.assert(memberMember);
  TestValidator.equals("member role is member", memberMember.role, "member");
  // 7. Create task with assigned_employee_id set to the member employee
  // The project-lead has permission to create tasks and assign them to project members
  const task =
    await generate_random_hrm_member_organizations_projects_tasks_create(
      leadConnection,
      {
        body: {
          title: RandomGenerator.name(3),
          priority: RandomGenerator.pick([
            "low",
            "medium",
            "high",
            "urgent",
          ] as const),
          assigned_employee_id: memberEmployeeId,
        } satisfies IHrmTask.ICreate,
        params: {
          organizationId,
          projectId: project.id,
        },
      },
    );
  typia.assert(task);
  // 8. Validate the task was created with the correct assigned employee
  TestValidator.equals(
    "task assigned employee ID matches member employee",
    task.assignedEmployee?.id,
    memberEmployeeId,
  );
  TestValidator.equals(
    "task belongs to correct project",
    task.project.id,
    project.id,
  );
  TestValidator.predicate("task has non-empty title", task.title.length > 0);
  TestValidator.predicate(
    "task has valid priority level",
    ["low", "medium", "high", "urgent"].includes(task.priority),
  );
  TestValidator.predicate(
    "task assigned employee is not null",
    task.assignedEmployee !== null,
  );
}
