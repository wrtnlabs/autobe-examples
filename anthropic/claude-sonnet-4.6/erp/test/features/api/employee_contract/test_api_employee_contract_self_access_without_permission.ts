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
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_employee_contract } from "../../../prepare/prepare_random_erp_hrm_employee_contract";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_employee_contract_self_access_without_permission(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a member (they'll be the org owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // Step 2: Create organization — owner is auto-provisioned as OrganizationMember
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Extract owner's organizationMemberId from the org response
  const organizationMemberId = organization.owner.id;
  // Step 4a: Create contract 1 — fixed-term (with end_date), earlier start
  const startDate1 = new Date("2024-01-01T00:00:00.000Z").toISOString();
  const endDate1 = new Date("2024-06-30T23:59:59.000Z").toISOString();
  const contract1 =
    await generate_random_erp_hrm_member_organization_members_contracts_create(
      ownerConnection,
      {
        params: { organizationMemberId },
        body: {
          payRate: 5000,
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
          startDate: startDate1,
          endDate: endDate1,
          notes: "Fixed-term contract",
        },
      },
    );
  typia.assert(contract1);
  // Step 4b: Create contract 2 — open-ended (null end_date), later start
  const startDate2 = new Date("2024-07-01T00:00:00.000Z").toISOString();
  const contract2 =
    await generate_random_erp_hrm_member_organization_members_contracts_create(
      ownerConnection,
      {
        params: { organizationMemberId },
        body: {
          payRate: 6000,
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
          startDate: startDate2,
          endDate: null,
          notes: "Open-ended contract",
        },
      },
    );
  typia.assert(contract2);
  // Step 5: Retrieve all contracts — no filter (self-access, no special permission needed)
  const allContracts =
    await api.functional.erpHrm.member.organizationMembers.contracts.index(
      ownerConnection,
      {
        organizationMemberId,
        body: {} satisfies IErpHrmEmployeeContract.IRequest,
      },
    );
  typia.assert(allContracts);
  // Assert pagination has at least 2 records
  TestValidator.predicate(
    "all contracts pagination records >= 2",
    allContracts.pagination.records >= 2,
  );
  // Assert both contracts are present (by ID)
  const allIds = allContracts.data.map((c) => c.id);
  TestValidator.predicate(
    "contract1 found in all contracts listing",
    allIds.includes(contract1.id),
  );
  TestValidator.predicate(
    "contract2 (open-ended) found in all contracts listing",
    allIds.includes(contract2.id),
  );
  // Assert each contract's organizationMember.id matches the owner's organizationMemberId
  for (const c of allContracts.data) {
    TestValidator.equals(
      "contract organizationMember.id matches owner",
      c.organizationMember.id,
      organizationMemberId,
    );
  }
  // Step 6: Call with endDate range filter AND includeOpenEnded=true
  // Use a range that covers the fixed-term contract but not the open-ended start
  const endDateFilter: IErpHrmContractDateRange = {
    gte: new Date("2024-01-01T00:00:00.000Z").toISOString(),
    lte: new Date("2024-12-31T23:59:59.000Z").toISOString(),
  };
  const withOpenEnded =
    await api.functional.erpHrm.member.organizationMembers.contracts.index(
      ownerConnection,
      {
        organizationMemberId,
        body: {
          endDate: endDateFilter,
          includeOpenEnded: true,
        } satisfies IErpHrmEmployeeContract.IRequest,
      },
    );
  typia.assert(withOpenEnded);
  const withOpenEndedIds = withOpenEnded.data.map((c) => c.id);
  TestValidator.predicate(
    "open-ended contract included when includeOpenEnded=true",
    withOpenEndedIds.includes(contract2.id),
  );
  // Step 7: Call with same endDate range filter AND includeOpenEnded=false
  const withoutOpenEnded =
    await api.functional.erpHrm.member.organizationMembers.contracts.index(
      ownerConnection,
      {
        organizationMemberId,
        body: {
          endDate: endDateFilter,
          includeOpenEnded: false,
        } satisfies IErpHrmEmployeeContract.IRequest,
      },
    );
  typia.assert(withoutOpenEnded);
  const withoutOpenEndedIds = withoutOpenEnded.data.map((c) => c.id);
  TestValidator.predicate(
    "open-ended contract excluded when includeOpenEnded=false",
    !withoutOpenEndedIds.includes(contract2.id),
  );
  // Also verify the fixed-term contract is present in the filtered results
  TestValidator.predicate(
    "fixed-term contract present when includeOpenEnded=false with matching endDate filter",
    withoutOpenEndedIds.includes(contract1.id),
  );
}
