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
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

export async function test_api_project_member_view_own_membership(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member and create initial organization (Owner role)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IErpHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {},
  );
  typia.assert(memberAuth);
  // 2. Create a project within the organization
  const project: IErpHrmProject =
    await generate_random_erp_hrm_member_projects_create(memberConnection, {});
  typia.assert(project);
  // 3. Assign the authenticated member to the project with 'member' role
  const projectMember: IErpHrmProjectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: { employee_id: memberAuth.id, role: "member" },
      },
    );
  typia.assert(projectMember);
  // 4. Request the project member details using own projectMemberId
  const result: IErpHrmProjectMember =
    await api.functional.erpHrm.member.projects.members.at(memberConnection, {
      projectId: project.id,
      projectMemberId: projectMember.id,
    });
  typia.assert(result);
  // 5. Validate response - verify membership details are correctly returned
  TestValidator.equals("role should be member", result.role, "member");
  TestValidator.equals(
    "project id should match",
    result.project.id,
    project.id,
  );
  TestValidator.equals(
    "employee member id should match",
    result.employee.member.id,
    memberAuth.id,
  );
  TestValidator.equals("deleted_at should be null", result.deleted_at, null);
}
