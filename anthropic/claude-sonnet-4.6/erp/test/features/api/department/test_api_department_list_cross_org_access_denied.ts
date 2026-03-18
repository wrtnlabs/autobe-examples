import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_organizations_departments_create } from "../../../generate/generate_random_erp_hrm_member_organizations_departments_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_department_list_cross_org_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // 2. Member A creates Organization A
  const orgA = await generate_random_erp_hrm_member_organizations_create(
    memberAConnection,
    {},
  );
  typia.assert(orgA);
  // 3. Member A creates a department inside Organization A
  const department =
    await generate_random_erp_hrm_member_organizations_departments_create(
      memberAConnection,
      {
        params: { organizationId: orgA.id },
        body: { name: "Engineering" },
      },
    );
  typia.assert(department);
  // 4. Register Member B (different account)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 5. Member B creates their own Organization B
  const orgB = await generate_random_erp_hrm_member_organizations_create(
    memberBConnection,
    {},
  );
  typia.assert(orgB);
  // Primary test: Member B tries to access Organization A's department list — must be forbidden
  await TestValidator.httpError(
    "member B cannot access org A departments",
    403,
    async () => {
      await api.functional.erpHrm.member.organizations.departments.index(
        memberBConnection,
        {
          organizationId: orgA.id,
          body: {} satisfies IErpHrmDepartment.IRequest,
        },
      );
    },
  );
  // Member B can access their own org's department list — must succeed with empty list
  const ownOrgDepts =
    await api.functional.erpHrm.member.organizations.departments.index(
      memberBConnection,
      {
        organizationId: orgB.id,
        body: {} satisfies IErpHrmDepartment.IRequest,
      },
    );
  typia.assert(ownOrgDepts);
  TestValidator.equals(
    "own org returns empty list",
    ownOrgDepts.data.length,
    0,
  );
}
