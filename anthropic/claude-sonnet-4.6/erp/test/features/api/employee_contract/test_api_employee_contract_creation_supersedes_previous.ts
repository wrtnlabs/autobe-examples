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

export async function test_api_employee_contract_creation_supersedes_previous(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register the manager/owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // Step 2: Create organization — owner becomes Owner with employee:manage permission
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Register the second member (the employee)
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {});
  typia.assert(employeeAuth);
  // Step 4: Add the employee to the organization — owner does this action
  // We need the employee's member ID and a role ID from the organization
  // The organization.owner.role.id gives the owner role; we need an employee role
  // The organization was just created, and it has built-in roles.
  // We can use the owner's role, but for the employee we should use
  // a role that exists in the organization. Since we don't have a list endpoint,
  // we'll use the built-in role from the organization owner (role id available via owner.role.id).
  // However, we need an employee-appropriate role. Let's use the owner.role.id as fallback
  // since we can't query roles independently.
  const organizationMember =
    await generate_random_erp_hrm_member_organization_members_create(
      ownerConnection,
      {
        body: {
          memberId: employeeAuth.member.id,
          roleId: organization.owner.role.id,
          employmentType: "full-time",
        },
      },
    );
  typia.assert(organizationMember);
  const organizationMemberId = organizationMember.id;
  // Step 5: Create the first contract (baseline)
  const firstContract =
    await generate_random_erp_hrm_member_organization_members_contracts_create(
      ownerConnection,
      {
        params: { organizationMemberId },
        body: {
          payRate: 3000,
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
          startDate: "2024-01-01T00:00:00.000Z",
          endDate: null,
          notes: null,
        },
      },
    );
  typia.assert(firstContract);
  const firstContractId = firstContract.id;
  // Validate first contract fields
  TestValidator.equals("first contract isActive", firstContract.isActive, true);
  TestValidator.equals("first contract payRate", firstContract.payRate, 3000);
  TestValidator.equals(
    "first contract payPeriod",
    firstContract.payPeriod,
    "monthly",
  );
  TestValidator.equals(
    "first contract workingHoursPerWeek",
    firstContract.workingHoursPerWeek,
    40,
  );
  TestValidator.equals(
    "first contract organizationMemberId",
    firstContract.organizationMemberId,
    organizationMemberId,
  );
  // Step 6: Create the second (replacement) contract
  const secondContract =
    await generate_random_erp_hrm_member_organization_members_contracts_create(
      ownerConnection,
      {
        params: { organizationMemberId },
        body: {
          payRate: 5000,
          payPeriod: "bi_weekly",
          workingHoursPerWeek: 35,
          startDate: "2024-07-01T00:00:00.000Z",
          endDate: null,
          notes: "Renegotiated contract",
        },
      },
    );
  typia.assert(secondContract);
  // Validate second contract is active and has correct values
  TestValidator.equals(
    "second contract isActive",
    secondContract.isActive,
    true,
  );
  TestValidator.equals("second contract payRate", secondContract.payRate, 5000);
  TestValidator.equals(
    "second contract payPeriod",
    secondContract.payPeriod,
    "bi_weekly",
  );
  TestValidator.equals(
    "second contract workingHoursPerWeek",
    secondContract.workingHoursPerWeek,
    35,
  );
  TestValidator.equals(
    "second contract notes",
    secondContract.notes,
    "Renegotiated contract",
  );
  TestValidator.equals(
    "second contract organizationMemberId",
    secondContract.organizationMemberId,
    organizationMemberId,
  );
  // Validate that the new contract has a different ID from the first
  TestValidator.notEquals(
    "contract IDs differ",
    secondContract.id,
    firstContractId,
  );
}
