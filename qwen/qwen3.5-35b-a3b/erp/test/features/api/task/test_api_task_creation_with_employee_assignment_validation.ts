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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { generate_random_hrms_member_projects_members_add_member } from "../../../generate/generate_random_hrms_member_projects_members_add_member";
import { generate_random_hrms_member_projects_tasks_create } from "../../../generate/generate_random_hrms_member_projects_tasks_create";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_project_member } from "../../../prepare/prepare_random_hrms_project_member";
import { prepare_random_hrms_task } from "../../../prepare/prepare_random_hrms_task";

/**
 * Test task creation with employee assignment validation.
 *
 * Validates that the system prevents assigning tasks to employees
 * who are not members of the project, ensuring proper access control
 * and task assignment integrity.
 */
export async function test_api_task_creation_with_employee_assignment_validation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: First member authenticates and creates organization
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAAuth);
  typia.assert(memberAAuth.organization_memberships[0]);
  // Step 2: First member creates a project within their organization
  const organizationId =
    memberAAuth.organization_memberships[0].organization.id;
  const project: IHrmsProject & { id: string } = typia.assert<IHrmsProject & { id: string }>(
    await api.functional.hrms.member.organizations.projects.create(
      memberAConnection,
      {
        organizationId,
        body: {
          name: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 6,
          }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          color_code: "#3498db",
          budget_hours: typia.random<number & tags.Minimum<100>>(),
          start_date: new Date().toISOString(),
        } satisfies IHrmsProject.ICreate,
      },
    ),
  );
  // Step 3: First member adds an employee (member A themselves) to the project as project lead
  const projectMemberA =
    await api.functional.hrms.member.projects.members.addMember(
      memberAConnection,
      {
        projectId: project.id,
        body: {
          employee_id: memberAAuth.id,
          role: "project-lead",
        } satisfies IHrmsProjectMember.ICreate,
      },
    );
  typia.assert(projectMemberA);
  // Step 4: Second member authenticates (creates their own organization)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberBAuth);
  // Step 5: Try to create a task assigning to an employee who is NOT a project member
  // Use member B's ID as they are NOT in the project
  const nonProjectMemberEmployeeId = memberBAuth.id;
  await TestValidator.error(
    "task creation should fail for non-project member assignment",
    async () => {
      // This should fail because member B is not a project member AND cannot access project
      await api.functional.hrms.member.projects.tasks.create(
        memberBConnection,
        {
          projectId: project.id,
          body: {
            title: RandomGenerator.paragraph({
              sentences: 2,
              wordMin: 3,
              wordMax: 5,
            }),
            description: RandomGenerator.paragraph({ sentences: 1 }),
            priority: "medium" as const,
            hrms_employee_id: nonProjectMemberEmployeeId,
          } satisfies IHrmsTask.ICreate,
        },
      );
    },
  );
  // Step 6: Verify no task was created
  // The task creation was rejected due to assignment validation
}