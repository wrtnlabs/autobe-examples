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

export async function test_api_contract_retrieval_own_active_contract(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      avatarUrl: null,
      timezone: null,
      locale: null,
    },
  });
  // Step 2: Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "America/New_York",
          fiscal_year_start_month: 1,
        },
      },
    );
  // Step 3: Create role
  const role = await generate_random_erp_hrm_member_roles_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        permissions: [{ permission: "employee.manage" }],
      },
    },
  );
  // Step 4: Create organization member
  const orgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      memberConnection,
      {
        body: {
          organizationId: organization.id,
          userId: authorizedMember.id,
          roleId: role.id,
          employmentType: "full_time",
          isActive: true,
          position: "Software Engineer",
        },
      },
    );
  // Step 5: Create active contract with specific compensation terms
  const startDate = new Date();
  const contract = await generate_random_erp_hrm_member_contracts_create(
    memberConnection,
    {
      body: {
        organization_member_id: orgMember.id,
        employment_type: "full-time",
        start_date: startDate.toISOString(),
        pay_rate: 5000.0,
        pay_period: "monthly",
        working_hours_per_week: 40,
        notes:
          "Employment contract with $5000 monthly salary, 40 hours per week",
      } satisfies IErpHrmContract.ICreate,
    },
  );
  // Step 6: Retrieve contract using the contractId from creation
  const retrievedContract = await api.functional.erpHrm.member.contracts.at(
    memberConnection,
    {
      contractId: contract.id,
    },
  );
  typia.assert(retrievedContract);
  // Step 7: Validate retrieved contract details
  TestValidator.equals(
    "contract ID matches created contract",
    retrievedContract.id,
    contract.id,
  );
  TestValidator.equals(
    "isActive field is true",
    retrievedContract.isActive,
    true,
  );
  TestValidator.equals(
    "employment type is full-time",
    retrievedContract.employmentType,
    "full-time",
  );
  TestValidator.equals(
    "pay rate is $5000.00",
    retrievedContract.payRate,
    5000.0,
  );
  TestValidator.equals(
    "pay period is monthly",
    retrievedContract.payPeriod,
    "monthly",
  );
  TestValidator.equals(
    "working hours per week is 40",
    retrievedContract.workingHoursPerWeek,
    40,
  );
  TestValidator.equals(
    "end date is null for active contract",
    retrievedContract.endDate,
    null,
  );
  TestValidator.equals(
    "notes match input",
    retrievedContract.notes,
    contract.notes,
  );
  // Validate nested organizationMember information
  TestValidator.equals(
    "organization member ID matches",
    retrievedContract.organizationMember.id,
    orgMember.id,
  );
  TestValidator.equals(
    "organization member employment type matches",
    retrievedContract.organizationMember.employment_type,
    "full_time",
  );
  TestValidator.equals(
    "organization member is active",
    retrievedContract.organizationMember.is_active,
    true,
  );
  // Validate organization context
  TestValidator.equals(
    "organization ID matches",
    retrievedContract.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "organization currency is USD",
    retrievedContract.organization.currency,
    "USD",
  );
}
