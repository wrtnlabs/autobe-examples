import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";

export async function test_api_project_detail_deleted_project_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and get an authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create an organization (member becomes owner with project:manage and project:view permissions)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Switch active context to the newly created organization
  const orgMember =
    await api.functional.erpHrm.member.organizations._switch.switchContext(
      memberConnection,
      { organizationId: organization.id },
    );
  typia.assert(orgMember);
  // 4. Create a project within the organization
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 5. Verify the project is accessible before deletion (should succeed)
  const fetchedProject = await api.functional.erpHrm.member.projects.at(
    memberConnection,
    { projectId: project.id },
  );
  typia.assert(fetchedProject);
  TestValidator.equals("project id matches", fetchedProject.id, project.id);
  // 6. Delete the project (soft delete - sets deleted_at timestamp)
  await api.functional.erpHrm.member.projects.erase(memberConnection, {
    projectId: project.id,
  });
  // 7. Attempt to retrieve the deleted project - should return 404 Not Found
  await TestValidator.httpError(
    "deleted project should return 404",
    404,
    async () => {
      await api.functional.erpHrm.member.projects.at(memberConnection, {
        projectId: project.id,
      });
    },
  );
}
