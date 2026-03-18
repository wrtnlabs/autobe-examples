import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmContractDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContractDateRange";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployeeContract";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmEmployeeContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organization_members_contracts_create } from "../../../generate/generate_random_erp_hrm_member_organization_members_contracts_create";
import { generate_random_erp_hrm_member_organization_members_create } from "../../../generate/generate_random_erp_hrm_member_organization_members_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_employee_contract } from "../../../prepare/prepare_random_erp_hrm_employee_contract";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";

export async function test_api_employee_contract_access_denied_without_employee_view_permission(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register the organization owner (first member)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuth);
  // Step 2: Create an organization with the owner's connection
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // The owner's OrganizationMember ID (from org owner field)
  const ownerOrgMemberId = organization.owner.id;
  // The owner's role id (only valid role ID accessible from available APIs)
  const ownerRoleId = organization.owner.role.id;
  // Step 3: Create at least one employment contract for the owner's OrganizationMember record
  const contract =
    await generate_random_erp_hrm_member_organization_members_contracts_create(
      ownerConnection,
      {
        params: {
          organizationMemberId: ownerOrgMemberId,
        },
      },
    );
  typia.assert(contract);
  // Step 4: Register the second platform user (basic employee)
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {});
  typia.assert(employeeAuth);
  // Step 5: Add the second user to the organization using the owner's connection
  const employeeOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      ownerConnection,
      {
        body: {
          memberId: employeeAuth.member.id,
          roleId: ownerRoleId,
          employmentType: "full-time",
        },
      },
    );
  typia.assert(employeeOrgMember);
  const employeeOrgMemberId = employeeOrgMember.id;
  // Step 6: Access denied scenario - employee tries to view OWNER's contracts
  // Expecting 403 Forbidden: employee lacks employee:view or employee:manage permission
  await TestValidator.httpError(
    "access denied: employee cannot view other member's contracts without employee:view permission",
    403,
    async () => {
      await api.functional.erpHrm.member.organizationMembers.contracts.index(
        employeeConnection,
        {
          organizationMemberId: ownerOrgMemberId,
          body: {} satisfies IErpHrmEmployeeContract.IRequest,
        },
      );
    },
  );
  // Step 7: Self-access allowed - employee views their OWN contracts (200 expected)
  const selfContracts =
    await api.functional.erpHrm.member.organizationMembers.contracts.index(
      employeeConnection,
      {
        organizationMemberId: employeeOrgMemberId,
        body: {} satisfies IErpHrmEmployeeContract.IRequest,
      },
    );
  typia.assert(selfContracts);
}
