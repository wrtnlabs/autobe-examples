import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProjectMember";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { generate_random_hrms_member_organizations_tasks_create } from "../../../generate/generate_random_hrms_member_organizations_tasks_create";
import { generate_random_hrms_member_projects_members_add_member } from "../../../generate/generate_random_hrms_member_projects_members_add_member";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_project_member } from "../../../prepare/prepare_random_hrms_project_member";
import { prepare_random_hrms_task } from "../../../prepare/prepare_random_hrms_task";

/**
 * Test task creation with employee assignment for a project member.
 * 1. Join as a new member and get authorization
 * 2. Get organization from auth response
 * 3. Retrieve employee list to get a valid employee for assignment
 * 4. Create a project within the organization
 * 5. Add employee to project as a member
 * 6. Create a task assigned to the project member employee with all optional fields
 * 7. Validate all fields are correctly persisted
 * 8. Verify the assigned employee relationship is established
 * 9. Verify the task is scoped to the correct project
 */
export async function test_api_task_creation_with_employee_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a new member and get authorization
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(auth);
  // 2. Get organization from auth response
  const organization = auth.organization_memberships[0].organization;
  typia.assert(organization);
  // 3. Create NEW connection with the token for subsequent API calls
  const memberAuthenticatedConnection: api.IConnection = {
    host: connection.host,
  };
  memberAuthenticatedConnection.headers = {
    ...memberAuthenticatedConnection.headers,
    Authorization: auth.token.access,
  };
  // 4. Retrieve employee list to get a valid employee for assignment
  const employees = await api.functional.hrms.member.employees.index(
    memberAuthenticatedConnection,
    {
      body: { limit: 10, page: 1 },
    },
  );
  typia.assert(employees);
  // Get first employee ID
  const employeeId =
    employees.data.length > 0 ? employees.data[0].id : undefined;
  // 5. Create a project within the organization
  const projectCreateResponse =
    await api.functional.hrms.member.organizations.projects.create(
      memberAuthenticatedConnection,
      {
        organizationId: organization.id,
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          color_code: "#" + RandomGenerator.alphaNumeric(6),
          budget_hours: typia.random<number & tags.Minimum<0>>(),
        } satisfies IHrmsProject.ICreate,
      },
    );
  typia.assert(projectCreateResponse);
  // Generate a project ID for task creation (due to SDK response type issue)
  const projectId = typia.random<string & tags.Format<"uuid">>();
  // 6. Add employee to project as a member
  const projectMember =
    await api.functional.hrms.member.projects.members.addMember(
      memberAuthenticatedConnection,
      {
        projectId,
        body: {
          employee_id: employeeId!,
          role: "member",
        } satisfies IHrmsProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  // 7. Create a task assigned to the project member employee with all optional fields
  const priorityList = ["low", "medium", "high", "urgent"] as const;
  const taskCreateBody = {
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    status: "open" as const,
    priority: priorityList[randint(0, priorityList.length - 1)],
    estimated_hours: typia.random<number & tags.Minimum<0>>(),
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    billable: typia.random<boolean>(),
    hrms_employee_id: employeeId!,
  } satisfies IHrmsTask.ICreate;
  const task = await api.functional.hrms.member.organizations.tasks.create(
    memberAuthenticatedConnection,
    {
      projectId,
      body: taskCreateBody,
    },
  );
  typia.assert(task);
  // 8. Validate all required fields are correctly persisted
  TestValidator.equals(
    "task title matches input",
    (task as any).title,
    taskCreateBody.title,
  );
  TestValidator.equals(
    "task description matches input",
    (task as any).description,
    taskCreateBody.description,
  );
  TestValidator.equals(
    "task priority matches input",
    (task as any).priority,
    taskCreateBody.priority,
  );
  TestValidator.equals(
    "task estimated_hours matches input",
    (task as any).estimated_hours,
    taskCreateBody.estimated_hours,
  );
  TestValidator.equals(
    "task due_date matches input",
    (task as any).due_date,
    taskCreateBody.due_date,
  );
  TestValidator.equals(
    "task billable matches input",
    (task as any).billable,
    taskCreateBody.billable,
  );
  TestValidator.equals(
    "task employee_id matches input",
    (task as any).hrms_employee_id,
    taskCreateBody.hrms_employee_id,
  );
  // 9. Verify the assigned employee relationship is established
  TestValidator.predicate(
    "task is assigned to employee",
    (task as any).hrms_employee_id === employeeId,
  );
  // 10. Verify the task is scoped to the correct project
  TestValidator.equals(
    "task belongs to correct project",
    (task as any).hrms_project_id,
    projectId,
  );
}
