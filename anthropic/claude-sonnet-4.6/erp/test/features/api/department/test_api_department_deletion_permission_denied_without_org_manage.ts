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
import { generate_random_erp_hrm_member_organizations_members_create } from "../../../generate/generate_random_erp_hrm_member_organizations_members_create";
import { generate_random_erp_hrm_member_organizations_roles_create } from "../../../generate/generate_random_erp_hrm_member_organizations_roles_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_department_deletion_permission_denied_without_org_manage(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register member A (owner) — authorize_member_join sets connection headers internally
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // Step 2: Member A creates an organization — becomes owner with org:manage
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberAConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Member A creates a department in the organization
  const department =
    await generate_random_erp_hrm_member_organizations_departments_create(
      memberAConnection,
      {
        params: { organizationId: organization.id },
      },
    );
  typia.assert(department);
  // Step 4: Member A creates a custom role WITHOUT org:manage (only employee:view)
  const viewerRole =
    await generate_random_erp_hrm_member_organizations_roles_create(
      memberAConnection,
      {
        body: {
          name: "Viewer",
          permissions: ["employee:view"],
        },
        params: { organizationId: organization.id },
      },
    );
  typia.assert(viewerRole);
  // Step 5: Register member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {});
  // Step 6: Member A adds member B to the organization with the Viewer role (no org:manage)
  const orgMember =
    await generate_random_erp_hrm_member_organizations_members_create(
      memberAConnection,
      {
        body: {
          memberId: memberBAuthorized.member.id,
          roleId: viewerRole.id,
          employmentType: "full-time",
        },
        params: { organizationId: organization.id },
      },
    );
  typia.assert(orgMember);
  // Step 7: Member B (lacks org:manage) attempts to delete the department — must be rejected with 403
  await TestValidator.httpError(
    "member without org:manage cannot delete department",
    403,
    async () => {
      await api.functional.erpHrm.member.organizations.departments.erase(
        memberBConnection,
        {
          organizationId: organization.id,
          departmentId: department.id,
        },
      );
    },
  );
}
