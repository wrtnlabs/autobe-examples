import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employee_invitations_create } from "../../../generate/generate_random_hrm_platform_member_employee_invitations_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

/**
 * Test that a project lead can create a task and assign it to an employee who is a project member.
 *
 * The test validates the complete workflow: (1) Organization owner member authenticates via join, (2) Organization is created with owner, (3) A second member (employee) is created and invited to the organization, (4) Project is created within the organization, (5) Employee is assigned to project as project member, (6) Task is created with assigned_employee_id referencing the project member, (7) Response includes assignedEmployee relation confirming valid assignment.
 *
 * This validates the business rule that only project members can be assigned to tasks within that project.
 *
 * 1. Organization owner member authenticates via join with unique credentials.
 * 2. Organization is created with the authenticated member as owner.
 * 3. A second member (employee) is created with unique email and invited to the organization. Since the email already has an account, the employee is immediately created.
 * 4. Project is created within the organization with name and color.
 * 5. Employee is assigned to project as project member with 'member' role.
 * 6. Task is created with assigned_employee_id referencing the project member's employee ID.
 * 7. Validates response includes assignedEmployee relation with matching employee ID.
 */
export async function test_api_project_task_creation_with_employee_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Organization owner member authenticates via join
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(owner);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Create employee (second member who will be invited to organization)
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeMember = await authorize_member_join(employeeConnection, {
    body: {
      email: employeeEmail,
      password: "Test1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(employeeMember);
  // Invite the employee to the organization - since they already have an account,
  // they will be immediately added as an employee
  const employeeInvitation =
    await generate_random_hrm_platform_member_employee_invitations_create(
      ownerConnection,
      {
        body: {
          email: employeeEmail,
          employment_type: "full-time",
          expires_at: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 30,
          ).toISOString(),
        },
      },
    );
  typia.assert(employeeInvitation);
  // Extract employee ID from the invitation response
  const employeeId = employeeInvitation.id;
  // 4. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        color: "#FF5733",
      },
    },
  );
  typia.assert(project);
  // 5. Assign employee to project as project member
  const projectMember =
    await generate_random_hrm_platform_member_projects_members_create(
      ownerConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          hrm_platform_employee_id: employeeId,
          role: "member",
        },
      },
    );
  typia.assert(projectMember);
  // 6. Create task with assigned_employee_id
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    ownerConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        priority: "high",
        assigned_employee_id: employeeId,
      },
    },
  );
  typia.assert(task);
  // 7. Validate response includes assignedEmployee relation
  TestValidator.predicate(
    "task has assigned employee",
    task.assignedEmployee !== null && task.assignedEmployee !== undefined,
  );
  TestValidator.equals(
    "assigned employee ID matches",
    task.assignedEmployee!.id,
    employeeId,
  );
}