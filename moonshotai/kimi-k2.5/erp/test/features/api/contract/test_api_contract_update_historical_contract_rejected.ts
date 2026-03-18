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

export async function test_api_contract_update_historical_contract_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member with employee management permission
  const adminConnection: api.IConnection = { host: connection.host };
  const adminMember = await authorize_member_join(adminConnection, {});
  typia.assert(adminMember);
  // 2. Create an organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      adminConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a role with employee management permissions
  const role = await generate_random_erp_hrm_member_roles_create(
    adminConnection,
    {
      body: {
        permissions: [{ permission: "employee.manage" }],
      },
    },
  );
  typia.assert(role);
  // 4. Create an organization member (admin acts as the employee)
  const orgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      adminConnection,
      {
        body: {
          organizationId: organization.id,
          userId: adminMember.id,
          roleId: role.id,
          employmentType: "full_time",
          isActive: true,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  typia.assert(orgMember);
  // 5. Create a historical contract with end_date in the past
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 30);
  const startDate = new Date(pastDate);
  startDate.setDate(startDate.getDate() - 30);
  const historicalContract =
    await generate_random_erp_hrm_member_contracts_create(adminConnection, {
      body: {
        organization_member_id: orgMember.id,
        employment_type: "full-time",
        start_date: startDate.toISOString(),
        end_date: pastDate.toISOString(),
        pay_rate: 5000,
        pay_period: "monthly",
        working_hours_per_week: 40,
      } satisfies IErpHrmContract.ICreate,
    });
  typia.assert(historicalContract);
  // Verify contract is historical (inactive)
  TestValidator.equals(
    "contract should be inactive",
    historicalContract.isActive,
    false,
  );
  TestValidator.notEquals(
    "contract should have end_date",
    historicalContract.endDate,
    null,
  );
  // 6. Attempt to update the historical contract and verify it's rejected
  await TestValidator.httpError(
    "updating historical contract should be rejected with 404 or 409",
    [404, 409],
    async () => {
      await api.functional.erpHrm.member.contracts.update(adminConnection, {
        contractId: historicalContract.id,
        body: {
          pay_rate: 6000,
        } satisfies IErpHrmContract.IUpdate,
      });
    },
  );
}
