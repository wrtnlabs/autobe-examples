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

export async function test_api_project_detail_cross_organization_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // ── Member A: Register, create Organization A, switch to it, create project ──
  // 1. Register Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // 2. Member A creates Organization A
  const organizationA =
    await generate_random_erp_hrm_member_organizations_create(
      memberAConnection,
      {},
    );
  typia.assert(organizationA);
  // 3. Member A switches context to Organization A
  const memberAOrgMember =
    await api.functional.erpHrm.member.organizations._switch.switchContext(
      memberAConnection,
      { organizationId: organizationA.id },
    );
  typia.assert(memberAOrgMember);
  // 4. Member A creates a project in Organization A
  const projectA = await generate_random_erp_hrm_member_projects_create(
    memberAConnection,
    {},
  );
  typia.assert(projectA);
  // ── Member B: Register, create Organization B, switch to it ──
  // 5. Register Member B (independent account)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 6. Member B creates Organization B
  const organizationB =
    await generate_random_erp_hrm_member_organizations_create(
      memberBConnection,
      {},
    );
  typia.assert(organizationB);
  // 7. Member B switches context to Organization B
  const memberBOrgMember =
    await api.functional.erpHrm.member.organizations._switch.switchContext(
      memberBConnection,
      { organizationId: organizationB.id },
    );
  typia.assert(memberBOrgMember);
  // ── Test: Member B tries to access Organization A's project ──
  // This must fail with 404 Not Found (cross-organization access denied)
  await TestValidator.httpError(
    "cross-organization project access denied",
    404,
    async () => {
      await api.functional.erpHrm.member.projects.at(memberBConnection, {
        projectId: projectA.id,
      });
    },
  );
}
