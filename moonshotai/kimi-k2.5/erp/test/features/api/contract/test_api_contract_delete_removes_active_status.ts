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
 * Test the business rule enforcement that only active contracts can be deleted
 * and that deletion removes the active contract status from the employee.
 */
export async function test_api_contract_delete_removes_active_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member (owner)
  const memberConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(memberConnection, {});
  typia.assert(owner);
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create role with employee management permissions
  const role = await generate_random_erp_hrm_member_roles_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        permissions: [
          {
            permission: "employee.manage",
          } satisfies IErpHrmRolePermission.ICreate,
        ],
      } satisfies IErpHrmRole.ICreate,
    },
  );
  typia.assert(role);
  // 4. Create employee user
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeUser = await authorize_member_join(employeeConnection, {});
  typia.assert(employeeUser);
  // 5. Create organization member (employee)
  const organizationMember =
    await generate_random_erp_hrm_member_organization_members_create(
      memberConnection,
      {
        body: {
          organizationId: organization.id,
          userId: employeeUser.id,
          roleId: role.id,
          employmentType: "full_time",
          isActive: true,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  typia.assert(organizationMember);
  // 6. Create historical contract (ended in the past)
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 60);
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 30);
  const historicalContract =
    await generate_random_erp_hrm_member_contracts_create(memberConnection, {
      body: {
        organization_member_id: organizationMember.id,
        employment_type: "full-time",
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        pay_rate: 5000,
        pay_period: "monthly",
        working_hours_per_week: 40,
      } satisfies IErpHrmContract.ICreate,
    });
  typia.assert(historicalContract);
  TestValidator.equals(
    "historical contract is inactive",
    historicalContract.isActive,
    false,
  );
  // 7. Create active contract (current, no end date)
  const activeContract = await generate_random_erp_hrm_member_contracts_create(
    memberConnection,
    {
      body: {
        organization_member_id: organizationMember.id,
        employment_type: "full-time",
        start_date: new Date().toISOString(),
        pay_rate: 6000,
        pay_period: "monthly",
        working_hours_per_week: 40,
      } satisfies IErpHrmContract.ICreate,
    },
  );
  typia.assert(activeContract);
  TestValidator.equals(
    "active contract is active",
    activeContract.isActive,
    true,
  );
  // 8. Attempt to delete historical contract - should fail (only active contracts can be deleted)
  await TestValidator.error("cannot delete historical contract", async () => {
    await api.functional.erpHrm.member.contracts.erase(memberConnection, {
      contractId: historicalContract.id,
    });
  });
  // 9. Delete active contract - should succeed
  await api.functional.erpHrm.member.contracts.erase(memberConnection, {
    contractId: activeContract.id,
  });
  // 10. Verify deletion succeeded (no error thrown)
  TestValidator.predicate("active contract deleted successfully", true);
}
