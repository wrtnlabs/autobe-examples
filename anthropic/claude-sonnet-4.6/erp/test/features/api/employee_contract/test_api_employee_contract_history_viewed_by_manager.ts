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

export async function test_api_employee_contract_history_viewed_by_manager(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register the owner/manager
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // Step 2: Create an organization (owner becomes org member with Owner role)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Register the second platform user (employee)
  const employeeAuthConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeAuthConnection, {});
  typia.assert(employeeAuth);
  // Step 4: Add the second user to the organization with Employee role
  // We need the role ID - the Owner role is built-in, we use the Employee built-in role
  // The organization owner has the built-in roles automatically, we pick Employee role id
  // from the organization owner's role list is not directly available
  // We need to add the employee to the org. The org member create requires a roleId.
  // Since we don't have a roles listing API in scope, we use the owner's own organization member
  // The Owner role is assigned to the owner, but we need the Employee role id.
  // We'll use the owner's connection to create org member — the roleId needed is the Employee built-in role.
  // Since we don't have a roles list endpoint available, we'll need to look at the owner's org member data.
  // The organization owner's member data is in organization.owner which is IErpHrmOrganizationMember.ISummary
  // The owner has the Owner role. We need a different role for the employee.
  // Since we can't list roles, we'll use the owner's role id (Owner role), which still works for testing contract listing.
  // Actually let's use the owner's role id as the roleId for the employee too - this is still valid for testing.
  const ownerRoleId = organization.owner.role.id;
  const employeeOrgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      ownerConnection,
      {
        body: {
          memberId: employeeAuth.id,
          roleId: ownerRoleId,
          employmentType: "full-time",
        },
      },
    );
  typia.assert(employeeOrgMember);
  // Step 5: Create a historical (past) contract for the employee
  const historicalStartDate = new Date(
    "2022-01-01T00:00:00.000Z",
  ).toISOString();
  const historicalEndDate = new Date("2022-12-31T23:59:59.999Z").toISOString();
  const historicalContract =
    await generate_random_erp_hrm_member_organization_members_contracts_create(
      ownerConnection,
      {
        params: { organizationMemberId: employeeOrgMember.id },
        body: {
          payRate: 3000,
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
          startDate: historicalStartDate,
          endDate: historicalEndDate,
          notes: "Historical contract",
        },
      },
    );
  typia.assert(historicalContract);
  // Step 6: Create a current active contract for the employee
  // Creating a new contract deactivates the previous one
  const activeStartDate = new Date("2023-01-01T00:00:00.000Z").toISOString();
  const activeContract =
    await generate_random_erp_hrm_member_organization_members_contracts_create(
      ownerConnection,
      {
        params: { organizationMemberId: employeeOrgMember.id },
        body: {
          payRate: 5000,
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
          startDate: activeStartDate,
          endDate: null,
          notes: "Active contract",
        },
      },
    );
  typia.assert(activeContract);
  // Target: PATCH /erpHrm/member/organizationMembers/{organizationMemberId}/contracts
  // Success path: retrieve all contracts with no filters
  const allContracts =
    await api.functional.erpHrm.member.organizationMembers.contracts.index(
      ownerConnection,
      {
        organizationMemberId: employeeOrgMember.id,
        body: {},
      },
    );
  typia.assert(allContracts);
  // Validate pagination metadata is present
  TestValidator.predicate(
    "pagination current >= 1",
    allContracts.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit >= 1",
    allContracts.pagination.limit >= 1,
  );
  TestValidator.predicate("records >= 2", allContracts.pagination.records >= 2);
  // Validate data array contains both contracts
  TestValidator.predicate(
    "data contains at least 2 contracts",
    allContracts.data.length >= 2,
  );
  // Validate that there is at least one active and one inactive contract
  const activeContracts = allContracts.data.filter((c) => c.is_active === true);
  const inactiveContracts = allContracts.data.filter(
    (c) => c.is_active === false,
  );
  TestValidator.predicate(
    "at least one active contract",
    activeContracts.length >= 1,
  );
  TestValidator.predicate(
    "at least one historical contract",
    inactiveContracts.length >= 1,
  );
  // Filtered retrieval: isActive=true
  const activeOnly =
    await api.functional.erpHrm.member.organizationMembers.contracts.index(
      ownerConnection,
      {
        organizationMemberId: employeeOrgMember.id,
        body: { isActive: true },
      },
    );
  typia.assert(activeOnly);
  TestValidator.predicate(
    "active only records >= 1",
    activeOnly.pagination.records >= 1,
  );
  TestValidator.predicate(
    "all returned are active",
    activeOnly.data.every((c) => c.is_active === true),
  );
  // Filtered retrieval: isActive=false
  const inactiveOnly =
    await api.functional.erpHrm.member.organizationMembers.contracts.index(
      ownerConnection,
      {
        organizationMemberId: employeeOrgMember.id,
        body: { isActive: false },
      },
    );
  typia.assert(inactiveOnly);
  TestValidator.predicate(
    "all returned are inactive",
    inactiveOnly.data.every((c) => c.is_active === false),
  );
  // Filtered retrieval: payPeriod matching the active contract's pay_period
  const activePayPeriod = activeContract.payPeriod;
  const byPayPeriod =
    await api.functional.erpHrm.member.organizationMembers.contracts.index(
      ownerConnection,
      {
        organizationMemberId: employeeOrgMember.id,
        body: { payPeriod: activePayPeriod },
      },
    );
  typia.assert(byPayPeriod);
  TestValidator.predicate(
    "all returned have matching pay_period",
    byPayPeriod.data.every((c) => c.pay_period === activePayPeriod),
  );
  // Filtered retrieval: sort='desc' → reverse chronological ordering (most recent first)
  const descSorted =
    await api.functional.erpHrm.member.organizationMembers.contracts.index(
      ownerConnection,
      {
        organizationMemberId: employeeOrgMember.id,
        body: { sort: "desc" },
      },
    );
  typia.assert(descSorted);
  // Validate descending order: each start_date should be >= next start_date
  for (let i = 0; i < descSorted.data.length - 1; i++) {
    TestValidator.predicate(
      "desc order: current start_date >= next start_date",
      new Date(descSorted.data[i]!.start_date).getTime() >=
        new Date(descSorted.data[i + 1]!.start_date).getTime(),
    );
  }
  // Empty result edge case: startDate.gte set far in the future
  const farFuture = new Date("2999-01-01T00:00:00.000Z").toISOString();
  const emptyResult =
    await api.functional.erpHrm.member.organizationMembers.contracts.index(
      ownerConnection,
      {
        organizationMemberId: employeeOrgMember.id,
        body: {
          startDate: { gte: farFuture },
        },
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals("empty result data array", emptyResult.data.length, 0);
  TestValidator.equals(
    "records=0 for future filter",
    emptyResult.pagination.records,
    0,
  );
}
