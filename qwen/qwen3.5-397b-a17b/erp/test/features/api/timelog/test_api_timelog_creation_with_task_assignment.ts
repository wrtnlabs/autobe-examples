import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_invitations_create } from "../../../generate/generate_random_hrm_platform_member_invitations_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_invitation } from "../../../prepare/prepare_random_hrm_platform_invitation";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test timelog creation with optional task assignment.
 *
 * This test verifies the complete workflow of creating a timelog entry with task assignment:
 * 1. Member registration and authentication (owner)
 * 2. Organization creation
 * 3. Custom role creation for employee
 * 4. Employee creation via invitation
 * 5. Second member registration (employee accepts invitation)
 * 6. Project creation by employee
 * 7. Project membership assignment
 * 8. Task creation within the project
 * 9. Timelog creation with taskId provided
 * 10. Validation that task relation is populated and matches the requested task
 */
export async function test_api_timelog_creation_with_task_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as organization owner
  const ownerAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "OwnerPassword123!",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(ownerAuth);
  // 2. Create owner-specific connection with auth token
  const ownerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: ownerAuth.token.access,
    },
  };
  // 3. Create organization
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
  // 4. Create custom role for employee
  const role = await generate_random_hrm_platform_member_roles_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        permissions: ["employee:view", "project:view", "time:manage"],
      },
    },
  );
  typia.assert(role);
  // 5. Create employee invitation
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const invitation =
    await generate_random_hrm_platform_member_invitations_create(
      ownerConnection,
      {
        body: {
          email: employeeEmail,
          role_id: role.id,
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      },
    );
  typia.assert(invitation);
  // 6. Register employee account (accepts invitation by signing up with invited email)
  const employeeAuth = await authorize_member_join(connection, {
    body: {
      email: employeeEmail,
      password: "EmployeePassword123!",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(employeeAuth);
  // 7. Create employee-specific connection
  const employeeConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: employeeAuth.token.access,
    },
  };
  // 8. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    employeeConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        color_code: "#3498db",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 9. Create project membership (employee assigns themselves to project)
  // Note: In a real scenario, we would get the employee ID from a "get current employee" endpoint.
  // For this test, we use the member ID as a placeholder. The actual employee ID would be
  // retrieved via GET /hrmPlatform/member/employees/me or similar endpoint.
  // The system should validate that the employee belongs to the organization.
  const projectMember =
    await generate_random_hrm_platform_member_projects_members_create(
      employeeConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          hrm_platform_employee_id: employeeAuth.id,
          role: "member",
        },
      },
    );
  typia.assert(projectMember);
  // 10. Create task within the project
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    employeeConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        status: "open",
        priority: "medium",
        description: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(task);
  // 11. Create timelog with task assignment
  const timelogDate = new Date().toISOString();
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    employeeConnection,
    {
      body: {
        date: timelogDate,
        durationMinutes: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
        >(),
        projectId: project.id,
        taskId: task.id,
        description: RandomGenerator.paragraph({ sentences: 1 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  // 12. Validate timelog response - task relation is populated
  TestValidator.predicate("timelog task is not null", timelog.task !== null);
  // 13. Validate task in timelog matches the requested task
  if (timelog.task !== null) {
    TestValidator.equals(
      "timelog task ID matches requested task",
      timelog.task.id,
      task.id,
    );
    TestValidator.equals(
      "timelog task title matches",
      timelog.task.title,
      task.title,
    );
  }
  // 14. Validate project relation
  TestValidator.equals(
    "timelog project matches requested project",
    timelog.project.id,
    project.id,
  );
  TestValidator.equals(
    "timelog project name matches",
    timelog.project.name,
    project.name,
  );
  // 15. Validate timelog fields
  TestValidator.predicate("timelog date is valid", timelog.date !== undefined);
  TestValidator.predicate(
    "timelog has valid duration",
    timelog.durationMinutes > 0,
  );
  TestValidator.equals("timelog billable flag matches", timelog.billable, true);
  // 16. Validate employee relation exists
  TestValidator.predicate(
    "timelog has employee relation",
    timelog.employee !== undefined,
  );
  TestValidator.predicate(
    "timelog employee has ID",
    timelog.employee.id !== undefined,
  );
  // 17. Validate timestamps exist
  TestValidator.predicate(
    "timelog has created timestamp",
    timelog.createdAt !== undefined,
  );
  TestValidator.predicate(
    "timelog has updated timestamp",
    timelog.updatedAt !== undefined,
  );
  TestValidator.predicate(
    "timelog deletedAt is null (not deleted)",
    timelog.deletedAt === null,
  );
}
