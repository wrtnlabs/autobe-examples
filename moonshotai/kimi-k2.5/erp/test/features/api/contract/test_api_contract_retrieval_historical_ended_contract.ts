import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
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
import { generate_random_erp_hrm_member_contracts_create } from "../../../generate/generate_random_erp_hrm_member_contracts_create";
import { generate_random_erp_hrm_member_organization_members_create } from "../../../generate/generate_random_erp_hrm_member_organization_members_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { prepare_random_erp_hrm_contract } from "../../../prepare/prepare_random_erp_hrm_contract";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";

/**
 * Test retrieval of historical ended contract.
 * Verifies that when a new contract is created, the previous contract becomes
 * historical (isActive=false, endDate populated) and can be retrieved with
 * complete audit trail preserved.
 */
export async function test_api_contract_retrieval_historical_ended_contract(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as owner/HR to perform organization setup
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  // 3. Create role for the employee
  const role = await generate_random_erp_hrm_member_roles_create(
    ownerConnection,
    {},
  );
  // 4. Create employee member who will have multiple contracts
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {});
  // 5. Create organization member linking employee to org
  const orgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      ownerConnection,
      {
        body: {
          organizationId: organization.id,
          userId: employee.id,
          roleId: role.id,
          employmentType: "full_time",
          isActive: true,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  // 6. Create first contract (started 2 months ago) - will become historical
  const startDate1 = new Date();
  startDate1.setMonth(startDate1.getMonth() - 2);
  const firstContract = await generate_random_erp_hrm_member_contracts_create(
    ownerConnection,
    {
      body: {
        organization_member_id: orgMember.id,
        employment_type: "full-time",
        start_date: startDate1.toISOString(),
        pay_rate: 50000,
        pay_period: "monthly",
        working_hours_per_week: 40,
      } satisfies IErpHrmContract.ICreate,
    },
  );
  typia.assert(firstContract);
  TestValidator.equals(
    "first contract is initially active",
    firstContract.isActive,
    true,
  );
  TestValidator.equals(
    "first contract initially has no end date",
    firstContract.endDate,
    null,
  );
  // 7. Create second contract (started 1 month ago) - auto-ends first contract
  const startDate2 = new Date();
  startDate2.setMonth(startDate2.getMonth() - 1);
  const secondContract = await generate_random_erp_hrm_member_contracts_create(
    ownerConnection,
    {
      body: {
        organization_member_id: orgMember.id,
        employment_type: "full-time",
        start_date: startDate2.toISOString(),
        pay_rate: 60000,
        pay_period: "monthly",
        working_hours_per_week: 40,
      } satisfies IErpHrmContract.ICreate,
    },
  );
  typia.assert(secondContract);
  TestValidator.equals(
    "second contract is active",
    secondContract.isActive,
    true,
  );
  // 8. Retrieve the historical (ended) first contract
  const historicalContract = await api.functional.erpHrm.member.contracts.at(
    ownerConnection,
    {
      contractId: firstContract.id,
    },
  );
  typia.assert(historicalContract);
  // 9. Validate historical contract properties
  TestValidator.equals(
    "historical contract ID matches",
    historicalContract.id,
    firstContract.id,
  );
  TestValidator.equals(
    "historical contract is not active",
    historicalContract.isActive,
    false,
  );
  TestValidator.notEquals(
    "historical contract has end date set",
    historicalContract.endDate,
    null,
  );
  TestValidator.equals(
    "historical contract pay rate preserved",
    historicalContract.payRate,
    firstContract.payRate,
  );
  TestValidator.equals(
    "historical contract employment type preserved",
    historicalContract.employmentType,
    firstContract.employmentType,
  );
}
