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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmProjectMember";
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

/**
 * Test project member listing filtered by project-lead role.
 *
 * Validates that the project member index endpoint correctly filters results by the `role` request parameter. The test sets up a project with two members — one regular "member" and one "project-lead" — then queries with `role: "project-lead"` to verify the filter excludes non-matching members.
 *
 * The response is validated to contain exactly one member record with the project-lead role. The returned member's employee profile fields — display name, position, employment type, and status — are compared against the originally invited employee to confirm correct identity resolution. The joined_at timestamp is verified as present, and pagination metadata is checked to confirm the total record count and page calculations reflect the single filtered result.
 *
 * 1. Authenticate a new member via join.
 * 2. Create a project in the member's organization.
 * 3. Invite two employees into the organization.
 * 4. Assign the first employee to the project with "member" role.
 * 5. Assign the second employee to the project with "project-lead" role.
 * 6. Call the member list endpoint with role filter set to "project-lead".
 * 7. Verify pagination records equals 1 and data length equals 1.
 * 8. Verify the single returned member has role "project-lead".
 * 9. Verify the returned employee identity matches the project-lead invitee (id, display_name, position, employment_type, status).
 * 10. Verify the regular member is absent from filtered results.
 */
export async function test_api_project_member_list_filter_by_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Invite first employee (will be regular member)
  const employee1 = await generate_random_erp_hrm_member_employees_create(
    memberConnection,
    {},
  );
  typia.assert(employee1);
  // 4. Invite second employee (will be project-lead)
  const employee2 = await generate_random_erp_hrm_member_employees_create(
    memberConnection,
    {},
  );
  typia.assert(employee2);
  // 5. Assign first employee as "member"
  const projectMember1 =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        body: {
          erp_hrm_employee_id: employee1.id,
          role: "member" as const,
        },
        params: { projectId: project.id },
      },
    );
  typia.assert(projectMember1);
  // 6. Assign second employee as "project-lead"
  const projectMember2 =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        body: {
          erp_hrm_employee_id: employee2.id,
          role: "project-lead" as const,
        },
        params: { projectId: project.id },
      },
    );
  typia.assert(projectMember2);
  // 7. List members filtered by project-lead role
  const result = await api.functional.erpHrm.member.projects.members.index(
    memberConnection,
    {
      projectId: project.id,
      body: {
        role: "project-lead",
      } satisfies IErpHrmProjectMember.IRequest,
    },
  );
  typia.assert(result);
  // 8. Validate pagination metadata
  TestValidator.equals("pagination records", result.pagination.records, 1);
  TestValidator.equals("data length", result.data.length, 1);
  TestValidator.predicate(
    "pagination pages valid",
    result.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination current valid",
    result.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit valid",
    result.pagination.limit >= 1,
  );
  // 9. Validate the returned project-lead member
  const projectLeadInResult = result.data[0];
  TestValidator.equals(
    "role is project-lead",
    projectLeadInResult.role,
    "project-lead",
  );
  TestValidator.equals(
    "employee id matches project-lead invitee",
    projectLeadInResult.employee.id,
    employee2.id,
  );
  TestValidator.equals(
    "display name matches",
    projectLeadInResult.employee.member.display_name,
    employee2.member.display_name,
  );
  TestValidator.equals(
    "position matches",
    projectLeadInResult.employee.position,
    employee2.position,
  );
  TestValidator.equals(
    "employment type matches",
    projectLeadInResult.employee.employment_type,
    employee2.employment_type,
  );
  TestValidator.equals(
    "status matches",
    projectLeadInResult.employee.status,
    employee2.status,
  );
  // 10. Verify the regular member is excluded from filtered results
  TestValidator.predicate(
    "regular member excluded",
    !result.data.some((m) => m.employee.id === employee1.id),
  );
}
