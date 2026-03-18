import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployeeContract";
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
import { generate_random_erp_hrm_member_organization_members_contracts_create } from "../../../generate/generate_random_erp_hrm_member_organization_members_contracts_create";
import { generate_random_erp_hrm_member_organization_members_create } from "../../../generate/generate_random_erp_hrm_member_organization_members_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_employee_contract } from "../../../prepare/prepare_random_erp_hrm_employee_contract";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";

export async function test_api_employee_contract_retrieval_by_manager_with_view_permission(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register Member A (manager/owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {});
  // memberAConnection.headers is now set with the JWT token via @setHeader
  // Step 2: As Member A, create an organization
  // Member A becomes the owner with all permissions including employee:manage and employee_view
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberAConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Register Member B (target employee)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {});
  typia.assert(memberBAuth);
  // Step 4: As Member A, add Member B to the organization
  // Use the Owner role ID from the organization (only role available without a list endpoint)
  const ownerRoleId = organization.owner.role.id;
  const organizationMemberB =
    await generate_random_erp_hrm_member_organization_members_create(
      memberAConnection,
      {
        body: {
          memberId: memberBAuth.id,
          roleId: ownerRoleId,
          employmentType: "full-time",
        },
      },
    );
  typia.assert(organizationMemberB);
  // Step 5: As Member A (has employee:manage), create a contract for Member B
  const startDate = new Date("2024-01-01T00:00:00.000Z").toISOString();
  const contract =
    await generate_random_erp_hrm_member_organization_members_contracts_create(
      memberAConnection,
      {
        params: {
          organizationMemberId: organizationMemberB.id,
        },
        body: {
          payRate: 5000,
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
          startDate: startDate,
          endDate: null,
          notes: null,
        },
      },
    );
  typia.assert(contract);
  // Step 6: As Member A (with employee_view permission), retrieve Member B's contract
  const retrieved =
    await api.functional.erpHrm.member.organizationMembers.contracts.at(
      memberAConnection,
      {
        organizationMemberId: organizationMemberB.id,
        contractId: contract.id,
      },
    );
  typia.assert(retrieved);
  // Validate the returned contract matches what was created
  TestValidator.equals(
    "organizationMemberId matches",
    retrieved.organizationMemberId,
    organizationMemberB.id,
  );
  TestValidator.equals("payRate matches", retrieved.payRate, 5000);
  TestValidator.equals("payPeriod matches", retrieved.payPeriod, "monthly");
  TestValidator.equals(
    "workingHoursPerWeek matches",
    retrieved.workingHoursPerWeek,
    40,
  );
  TestValidator.equals("isActive is true", retrieved.isActive, true);
  TestValidator.equals("endDate is null", retrieved.endDate, null);
  TestValidator.equals("notes is null", retrieved.notes, null);
  TestValidator.equals("contract id matches", retrieved.id, contract.id);
}
