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
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

export async function test_api_project_member_view_with_permission(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first member (viewer) - becomes org owner with all permissions
  const viewerConnection: api.IConnection = { host: connection.host };
  const viewerAuth = await authorize_member_join(viewerConnection, {});
  typia.assert(viewerAuth);
  // Step 2: Create a project within the organization
  const project = await generate_random_erp_hrm_member_projects_create(
    viewerConnection,
    {},
  );
  typia.assert(project);
  // Step 3: Create a second member who will be assigned to the project
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMemberAuth = await authorize_member_join(
    secondMemberConnection,
    {},
  );
  typia.assert(secondMemberAuth);
  // Step 4: Create an employee record for the second member
  // Note: The utility function handles role assignment internally
  const secondEmployee = await generate_random_erp_hrm_member_employees_create(
    viewerConnection,
    {
      body: {
        email: secondMemberAuth.email,
        employmentType: "full_time",
      },
    },
  );
  typia.assert(secondEmployee);
  // Step 5: Assign the second member to the project
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      viewerConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: secondEmployee.id,
          role: "member",
        },
      },
    );
  typia.assert(projectMember);
  // Step 6: As the first member (viewer), request the project membership details
  const retrievedMember =
    await api.functional.erpHrm.member.projects.members.at(viewerConnection, {
      projectId: project.id,
      projectMemberId: projectMember.id,
    });
  typia.assert(retrievedMember);
  // Step 7: Validate the response contains complete project member data
  TestValidator.equals(
    "project member id",
    retrievedMember.id,
    projectMember.id,
  );
  TestValidator.equals("project id", retrievedMember.project.id, project.id);
  TestValidator.equals(
    "employee id",
    retrievedMember.employee.id,
    secondEmployee.id,
  );
  TestValidator.equals("member role", retrievedMember.role, "member");
  TestValidator.predicate(
    "employee has member info",
    retrievedMember.employee.member.id !== undefined,
  );
  TestValidator.predicate(
    "project has name",
    retrievedMember.project.name !== undefined,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    retrievedMember.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    retrievedMember.updated_at !== undefined,
  );
  TestValidator.equals(
    "deleted_at should be null",
    retrievedMember.deleted_at,
    null,
  );
}
