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
 * Test that a member with employee management permissions can successfully delete an active employment contract.
 * First authenticate as a member, create an organization with appropriate settings (currency, timezone, fiscal year),
 * create a custom role with employee management permissions, create an organization member (employee) assigned to that role,
 * then create an active employment contract for that member. Finally, delete the contract using the contract ID and verify
 * the operation succeeds with 204 No Content response.
 */
export async function test_api_contract_delete_active_contract_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_member_join(adminConnection, {});
  typia.assert(admin);
  // Create organization with required settings
  const organization =
    await generate_random_erp_hrm_member_organizations_create(adminConnection, {
      body: {
        name: RandomGenerator.name(),
        currency: "USD",
        timezone: "America/New_York",
        fiscal_year_start_month: 1,
      } satisfies IErpHrmOrganization.ICreate,
    });
  typia.assert(organization);
  // Create role with employee management permissions
  const role = await generate_random_erp_hrm_member_roles_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        permissions: [
          { permission: "employee.manage" },
        ] satisfies IErpHrmRolePermission.ICreate[],
      } satisfies IErpHrmRole.ICreate,
    },
  );
  typia.assert(role);
  // Create employee user to be assigned to the organization
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {});
  typia.assert(employee);
  // Create organization member for the employee
  const orgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      adminConnection,
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
  typia.assert(orgMember);
  // Create active employment contract for the member
  const contract = await generate_random_erp_hrm_member_contracts_create(
    adminConnection,
    {
      body: {
        organization_member_id: orgMember.id,
        employment_type: "full-time",
        start_date: new Date().toISOString(),
        pay_rate: 5000,
        pay_period: "monthly",
        working_hours_per_week: 40,
      } satisfies IErpHrmContract.ICreate,
    },
  );
  typia.assert(contract);
  // Delete the contract - should succeed with 204 No Content
  await api.functional.erpHrm.member.contracts.erase(adminConnection, {
    contractId: contract.id,
  });
  // Verify contract no longer exists by attempting to delete again (should throw error)
  await TestValidator.error(
    "contract should not exist after deletion",
    async () => {
      await api.functional.erpHrm.member.contracts.erase(adminConnection, {
        contractId: contract.id,
      });
    },
  );
}
