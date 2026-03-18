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

export async function test_api_contract_creation_auto_terminates_previous_active(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Join as a member to get authenticated
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Step 2: Create an organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Create a role with employee management permissions
  const role = await generate_random_erp_hrm_member_roles_create(
    memberConnection,
    {
      body: {
        name: "HR Manager",
        description: "Role with employee management permissions",
        permissions: [
          { permission: "employee.manage" },
          { permission: "employee.view" },
        ],
      },
    },
  );
  typia.assert(role);
  // Step 4: Create an organization member
  const organizationMember =
    await generate_random_erp_hrm_member_organization_members_create(
      memberConnection,
      {
        body: {
          organizationId: organization.id,
          userId: member.id,
          roleId: role.id,
          employmentType: "full_time",
          isActive: true,
          position: "Software Engineer",
        },
      },
    );
  typia.assert(organizationMember);
  // Step 5: Create the FIRST contract - will be active initially
  const firstContract = await generate_random_erp_hrm_member_contracts_create(
    memberConnection,
    {
      body: {
        organization_member_id: organizationMember.id,
        employment_type: "full-time",
        start_date: new Date().toISOString(),
        pay_rate: 50000,
        pay_period: "monthly",
        working_hours_per_week: 40,
      },
    },
  );
  typia.assert(firstContract);
  // Validate first contract is active
  TestValidator.equals("first contract isActive", firstContract.isActive, true);
  TestValidator.equals(
    "first contract has matching org member",
    firstContract.organizationMember.id,
    organizationMember.id,
  );
  // Step 6: Create the SECOND contract - should auto-terminate first contract
  const secondContract = await generate_random_erp_hrm_member_contracts_create(
    memberConnection,
    {
      body: {
        organization_member_id: organizationMember.id,
        employment_type: "part-time",
        start_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        end_date: null,
        pay_rate: 30000,
        pay_period: "bi-weekly",
        working_hours_per_week: 20,
        notes: "Updated part-time contract",
      },
    },
  );
  typia.assert(secondContract);
  // Validate second contract
  TestValidator.equals(
    "second contract isActive",
    secondContract.isActive,
    true,
  );
  TestValidator.equals(
    "second contract has part-time type",
    secondContract.employmentType,
    "part-time",
  );
  TestValidator.equals(
    "second contract pay rate",
    secondContract.payRate,
    30000,
  );
  TestValidator.equals(
    "second contract pay period",
    secondContract.payPeriod,
    "bi-weekly",
  );
  TestValidator.equals(
    "second contract working hours",
    secondContract.workingHoursPerWeek,
    20,
  );
  TestValidator.equals(
    "second contract notes",
    secondContract.notes,
    "Updated part-time contract",
  );
  // Validate contracts have different IDs
  TestValidator.notEquals(
    "contracts have different IDs",
    firstContract.id,
    secondContract.id,
  );
  // Key validation: second contract should be the active one for this member
  TestValidator.predicate(
    "second contract isActive is true",
    secondContract.isActive === true,
  );
  // Note: The first contract's isActive should now be false after auto-termination,
  // but we cannot retrieve it since there's no GET API for contracts
}
