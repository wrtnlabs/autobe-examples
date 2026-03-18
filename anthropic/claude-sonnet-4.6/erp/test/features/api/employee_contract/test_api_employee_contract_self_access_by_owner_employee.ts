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
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_employee_contract } from "../../../prepare/prepare_random_erp_hrm_employee_contract";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_employee_contract_self_access_by_owner_employee(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register member A (the org owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // Step 2: Create an organization as member A
  // Member A becomes the Owner and an OrganizationMember record is created for them
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberAConnection,
      {},
    );
  typia.assert(organization);
  // Record member A's organizationMemberId from the returned organization's owner field
  const ownerOrganizationMemberId = organization.owner.id;
  // Step 3: Create a contract for member A's own OrganizationMember record
  // As owner, member A has employee:manage permission
  const startDate = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 30 days ago
  const contract =
    await generate_random_erp_hrm_member_organization_members_contracts_create(
      memberAConnection,
      {
        body: {
          payRate: 8000,
          payPeriod: "bi_weekly",
          workingHoursPerWeek: 37.5,
          startDate: startDate,
          endDate: null,
          notes: "Initial owner contract",
        },
        params: {
          organizationMemberId: ownerOrganizationMemberId,
        },
      },
    );
  typia.assert(contract);
  // Step 4: Retrieve the contract as member A (self-access)
  // Member A accesses their own contract using their organizationMemberId
  const retrievedContract =
    await api.functional.erpHrm.member.organizationMembers.contracts.at(
      memberAConnection,
      {
        organizationMemberId: ownerOrganizationMemberId,
        contractId: contract.id,
      },
    );
  typia.assert(retrievedContract);
  // Validate the returned contract matches what was created
  TestValidator.equals("payRate matches", retrievedContract.payRate, 8000);
  TestValidator.equals(
    "payPeriod matches",
    retrievedContract.payPeriod,
    "bi_weekly",
  );
  TestValidator.equals(
    "workingHoursPerWeek matches",
    retrievedContract.workingHoursPerWeek,
    37.5,
  );
  TestValidator.equals("isActive is true", retrievedContract.isActive, true);
  TestValidator.equals(
    "notes match",
    retrievedContract.notes,
    "Initial owner contract",
  );
  TestValidator.equals("endDate is null", retrievedContract.endDate, null);
  TestValidator.equals(
    "organizationMemberId matches",
    retrievedContract.organizationMemberId,
    ownerOrganizationMemberId,
  );
  TestValidator.equals(
    "contract id matches",
    retrievedContract.id,
    contract.id,
  );
}
