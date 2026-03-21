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

export async function test_api_project_member_removal_by_authorized_manager(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create organization owner (has implicit project:manage permission)
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // Step 2: Create a project in the organization
  const project = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {},
  );
  typia.assert(project);
  // Step 3: Create an employee in the organization
  const employee = await generate_random_erp_hrm_member_employees_create(
    ownerConnection,
    {},
  );
  typia.assert(employee);
  // Step 4: Assign the employee to the project as a regular member
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      ownerConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: employee.id,
          role: "member",
        },
      },
    );
  typia.assert(projectMember);
  // Step 5: Verify project membership was created correctly
  TestValidator.equals(
    "employee assigned correctly",
    projectMember.employee.id,
    employee.id,
  );
  TestValidator.equals("role is member", projectMember.role, "member");
  // Step 6: Remove the project member by authorized manager (organization owner)
  await api.functional.erpHrm.member.projects.members.erase(ownerConnection, {
    projectId: project.id,
    projectMemberId: projectMember.id,
  });
  // Operation completed successfully
  // Soft-deletion preserves the record with deleted_at timestamp for audit
  // Historical timelogs and task assignments remain intact per business requirements
}
