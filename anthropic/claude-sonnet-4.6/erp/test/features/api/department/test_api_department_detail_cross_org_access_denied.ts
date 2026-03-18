import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
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
import { generate_random_erp_hrm_member_organizations_departments_create } from "../../../generate/generate_random_erp_hrm_member_organizations_departments_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_department_detail_cross_org_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // ── Step 1: Member A registers and gets their own connection ──
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // ── Step 2: Member A creates Organization A ──
  const organizationA =
    await generate_random_erp_hrm_member_organizations_create(
      memberAConnection,
      {},
    );
  typia.assert(organizationA);
  // ── Step 3: Member A creates a department in Organization A ──
  const departmentA =
    await generate_random_erp_hrm_member_organizations_departments_create(
      memberAConnection,
      {
        params: {
          organizationId: organizationA.id,
        },
      },
    );
  typia.assert(departmentA);
  // ── Step 4: Member B registers and gets their own connection ──
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // ── Step 5: Member B creates Organization B ──
  const organizationB =
    await generate_random_erp_hrm_member_organizations_create(
      memberBConnection,
      {},
    );
  typia.assert(organizationB);
  // ── Test: Member B tries to access Organization A's department ──
  // Should be denied with 403 because Member B doesn't belong to Organization A
  await TestValidator.httpError(
    "cross-org department access denied (403)",
    403,
    async () => {
      await api.functional.erpHrm.member.organizations.departments.at(
        memberBConnection,
        {
          organizationId: organizationA.id,
          departmentId: departmentA.id,
        },
      );
    },
  );
  // ── Edge case: Member B creates and retrieves a department in Organization B ──
  const departmentB =
    await generate_random_erp_hrm_member_organizations_departments_create(
      memberBConnection,
      {
        params: {
          organizationId: organizationB.id,
        },
      },
    );
  typia.assert(departmentB);
  // Member B CAN access their own organization's department
  const retrievedDepartmentB =
    await api.functional.erpHrm.member.organizations.departments.at(
      memberBConnection,
      {
        organizationId: organizationB.id,
        departmentId: departmentB.id,
      },
    );
  typia.assert(retrievedDepartmentB);
  TestValidator.equals(
    "department id matches",
    retrievedDepartmentB.id,
    departmentB.id,
  );
}
