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

export async function test_api_organization_member_self_profile_update_department_assignment_and_clear(
  connection: api.IConnection,
): Promise<void> {
  // ─── Setup: Member 1 + Org 1 + Departments ───────────────────────────────
  // Register member 1 (connection headers are updated internally)
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {});
  // Create organization 1 under member 1
  const org1 = await generate_random_erp_hrm_member_organizations_create(
    member1Connection,
    {},
  );
  typia.assert(org1);
  // Create "Engineering" department in org1
  const engineeringDept =
    await generate_random_erp_hrm_member_organizations_departments_create(
      member1Connection,
      {
        body: { name: "Engineering" },
        params: { organizationId: org1.id },
      },
    );
  typia.assert(engineeringDept);
  // Create "Product" department in org1
  const productDept =
    await generate_random_erp_hrm_member_organizations_departments_create(
      member1Connection,
      {
        body: { name: "Product" },
        params: { organizationId: org1.id },
      },
    );
  typia.assert(productDept);
  // ─── Test 1: Assign "Engineering" department ──────────────────────────────
  const updatedWithEngineering =
    await api.functional.erpHrm.member.organizations.members.update(
      member1Connection,
      {
        organizationId: org1.id,
        body: {
          department_id: engineeringDept.id,
        } satisfies IErpHrmOrganizationMember.IUpdate,
      },
    );
  typia.assert(updatedWithEngineering);
  TestValidator.equals(
    "department assigned to Engineering",
    updatedWithEngineering.department?.id,
    engineeringDept.id,
  );
  TestValidator.equals(
    "department name is Engineering",
    updatedWithEngineering.department?.name,
    "Engineering",
  );
  // ─── Test 2: Re-assign to "Product" department ───────────────────────────
  const updatedWithProduct =
    await api.functional.erpHrm.member.organizations.members.update(
      member1Connection,
      {
        organizationId: org1.id,
        body: {
          department_id: productDept.id,
        } satisfies IErpHrmOrganizationMember.IUpdate,
      },
    );
  typia.assert(updatedWithProduct);
  TestValidator.equals(
    "department re-assigned to Product",
    updatedWithProduct.department?.id,
    productDept.id,
  );
  TestValidator.equals(
    "department name is Product",
    updatedWithProduct.department?.name,
    "Product",
  );
  // ─── Test 3: Clear department (null) ─────────────────────────────────────
  const updatedWithNoDept =
    await api.functional.erpHrm.member.organizations.members.update(
      member1Connection,
      {
        organizationId: org1.id,
        body: {
          department_id: null,
        } satisfies IErpHrmOrganizationMember.IUpdate,
      },
    );
  typia.assert(updatedWithNoDept);
  TestValidator.equals(
    "department cleared to null",
    updatedWithNoDept.department,
    null,
  );
  // Verify other fields remain from previous update (they should be unchanged)
  TestValidator.equals(
    "employment_type unchanged after clearing department",
    updatedWithNoDept.employment_type,
    updatedWithProduct.employment_type,
  );
  TestValidator.equals(
    "status unchanged after clearing department",
    updatedWithNoDept.status,
    updatedWithProduct.status,
  );
  TestValidator.equals(
    "position unchanged after clearing department",
    updatedWithNoDept.position,
    updatedWithProduct.position,
  );
  TestValidator.equals(
    "role unchanged after clearing department",
    updatedWithNoDept.role.id,
    updatedWithProduct.role.id,
  );
  // ─── Test 4: Cross-organization department rejection ─────────────────────
  // Register member 2 with a separate connection
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {});
  // Create organization 2 under member 2
  const org2 = await generate_random_erp_hrm_member_organizations_create(
    member2Connection,
    {},
  );
  typia.assert(org2);
  // Create a department in org2
  const org2Dept =
    await generate_random_erp_hrm_member_organizations_departments_create(
      member2Connection,
      {
        body: { name: "Finance" },
        params: { organizationId: org2.id },
      },
    );
  typia.assert(org2Dept);
  // Attempt to assign org2's department to member1's org1 — should be rejected
  await TestValidator.error(
    "cross-org department assignment should be rejected",
    async () => {
      await api.functional.erpHrm.member.organizations.members.update(
        member1Connection,
        {
          organizationId: org1.id,
          body: {
            department_id: org2Dept.id,
          } satisfies IErpHrmOrganizationMember.IUpdate,
        },
      );
    },
  );
}
