import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_hrm_platform_admin_invitations_create } from "../../../generate/generate_random_hrm_platform_admin_invitations_create";
import { generate_random_hrm_platform_contracts_create } from "../../../generate/generate_random_hrm_platform_contracts_create";
import { prepare_random_hrm_platform_contract } from "../../../prepare/prepare_random_hrm_platform_contract";
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";

/**
 * Test that admin users can view any employee's contract within their organization.
 *
 * This test verifies:
 * 1. Admin authentication and authorization
 * 2. Contract creation for an employee
 * 3. Admin's ability to view any employee's contract in the organization
 * 4. Complete contract data visibility including employee and organization details
 */
export async function test_api_contract_view_by_admin_any_employee(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin user
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create contract for an employee
  // The generation function handles employee selection/creation internally
  const contract = await generate_random_hrm_platform_contracts_create(
    adminConnection,
    {
      body: {
        start_at: new Date().toISOString(),
        end_at: null,
        pay_rate: 50000,
        pay_period: "monthly",
        working_hours_per_week: 40,
      },
    },
  );
  typia.assert(contract);
  // 3. Admin views the employee's contract
  const viewedContract = await api.functional.hrmPlatform.contracts.at(
    adminConnection,
    {
      contractId: contract.id,
    },
  );
  typia.assert(viewedContract);
  // 4. Verify contract details match
  TestValidator.equals("contract id matches", viewedContract.id, contract.id);
  TestValidator.equals(
    "employee id matches",
    viewedContract.employee.id,
    contract.employee.id,
  );
  TestValidator.equals(
    "organization id matches",
    viewedContract.organization.id,
    contract.organization.id,
  );
  TestValidator.equals(
    "start_at matches",
    viewedContract.start_at,
    contract.start_at,
  );
  TestValidator.equals(
    "end_at matches",
    viewedContract.end_at,
    contract.end_at,
  );
  TestValidator.equals(
    "pay_rate matches",
    viewedContract.pay_rate,
    contract.pay_rate,
  );
  TestValidator.equals(
    "pay_period matches",
    viewedContract.pay_period,
    contract.pay_period,
  );
  TestValidator.equals(
    "working_hours_per_week matches",
    viewedContract.working_hours_per_week,
    contract.working_hours_per_week,
  );
  // 5. Verify employee information is accessible
  TestValidator.predicate(
    "employee member email exists",
    viewedContract.employee.member.email.length > 0,
  );
  // 6. Verify organization information is accessible
  TestValidator.predicate(
    "organization name exists",
    viewedContract.organization.name.length > 0,
  );
  TestValidator.predicate(
    "organization has valid currency",
    viewedContract.organization.setting.currency.length > 0,
  );
  TestValidator.predicate(
    "organization has valid timezone",
    viewedContract.organization.setting.timezone.length > 0,
  );
}
