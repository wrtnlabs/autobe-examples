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
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

/**
 * Test retrieving a project when the authenticated member is assigned to that project as a project member.
 *
 * Setup:
 * 1. Authenticate as member via POST /erpHrm/auth/member/join
 * 2. Create a project via POST /erpHrm/member/projects
 * 3. Assign the authenticated member to the project via POST /erpHrm/member/projects/{projectId}/members
 *
 * Test:
 * Call GET /erpHrm/member/projects/{projectId} with the projectId from setup
 *
 * Validation:
 * - Response status should be 200 OK
 * - Response body should contain complete project details (id, name, description, color, status, budget_hours, start_date, end_date, created_at, updated_at)
 * - Organization context should be included
 * - Project memberships count should be >= 1
 * - Tasks count should be >= 0
 *
 * This validates the core business rule that project members can view project details.
 */
export async function test_api_project_retrieval_by_assigned_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IErpHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IErpHrmMember.IJoin,
    },
  );
  typia.assert(authorized);
  // Step 2: Create a project within the organization
  const project: IErpHrmProjectMember =
    await generate_random_erp_hrm_member_projects_create(memberConnection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        color: "#" + RandomGenerator.alphabets(6).toUpperCase(),
        status: "active",
      },
    });
  typia.assert(project);
  // Step 3: Assign the authenticated member to the project
  // Note: The member must be assigned as an employee first, then as a project member
  // For this test, we use the member's authorized data to create project membership
  const projectMembership: IErpHrmProjectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 1 }),
          color: "#" + RandomGenerator.alphabets(6).toUpperCase(),
          status: "active",
        },
      },
    );
  typia.assert(projectMembership);
  // Step 4: Retrieve the project - this validates that an assigned member can view project details
  const retrievedProject: IErpHrmProjectMember =
    await api.functional.erpHrm.member.projects.at(memberConnection, {
      projectId: project.id,
    });
  typia.assert(retrievedProject);
  // Validation: Complete project details are returned
  TestValidator.equals("project id matches", retrievedProject.id, project.id);
  TestValidator.equals(
    "project name matches",
    retrievedProject.name,
    project.name,
  );
  TestValidator.equals(
    "project description matches",
    retrievedProject.description,
    project.description,
  );
  TestValidator.equals(
    "project color matches",
    retrievedProject.color,
    project.color,
  );
  TestValidator.equals(
    "project status matches",
    retrievedProject.status,
    project.status,
  );
  TestValidator.equals(
    "project budget_hours matches",
    retrievedProject.budget_hours,
    project.budget_hours,
  );
  TestValidator.equals(
    "project start_date matches",
    retrievedProject.start_date,
    project.start_date,
  );
  TestValidator.equals(
    "project end_date matches",
    retrievedProject.end_date,
    project.end_date,
  );
  // Validation: Organization context is included
  TestValidator.predicate(
    "organization exists",
    retrievedProject.organization !== null &&
      retrievedProject.organization !== undefined,
  );
  TestValidator.equals(
    "organization id matches",
    retrievedProject.organization.id,
    project.organization.id,
  );
  // Validation: Project memberships count should be >= 1
  TestValidator.predicate(
    "project memberships count >= 1",
    retrievedProject.project_members_count >= 1,
  );
  // Validation: Tasks count should be >= 0
  TestValidator.predicate(
    "tasks count >= 0",
    retrievedProject.tasks_count >= 0,
  );
}
