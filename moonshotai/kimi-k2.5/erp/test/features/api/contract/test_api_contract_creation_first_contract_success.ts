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

export async function test_api_contract_creation_first_contract_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as owner/admin
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
    },
  });
  typia.assert(owner);
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(ownerConnection, {
      body: {
        name: RandomGenerator.name(2),
        currency: "USD",
        timezone: "America/New_York",
        fiscal_year_start_month: 1,
      },
    });
  typia.assert(organization);
  // 3. Create role with employee management permissions
  const role = await generate_random_erp_hrm_member_roles_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(1),
        permissions: [
          { permission: "employee.manage" },
          { permission: "organization.manage" },
        ],
      },
    },
  );
  typia.assert(role);
  // 4. Join as employee
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
    },
  });
  typia.assert(employee);
  // 5. Create organization member (employee record)
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
        },
      },
    );
  typia.assert(orgMember);
  // 6. Create the first employment contract
  const startDate = new Date().toISOString();
  const contract = await generate_random_erp_hrm_member_contracts_create(
    ownerConnection,
    {
      body: {
        organization_member_id: orgMember.id,
        employment_type: "full-time",
        start_date: startDate,
        pay_rate: 50000,
        pay_period: "monthly",
        working_hours_per_week: 40,
        notes: "Initial employment contract",
      },
    },
  );
  typia.assert(contract);
  // 7. Validate contract business logic
  TestValidator.equals("contract is active", contract.isActive, true);
  TestValidator.equals(
    "employment type matches",
    contract.employmentType,
    "full-time",
  );
  TestValidator.equals("pay rate matches", contract.payRate, 50000);
  TestValidator.equals("pay period matches", contract.payPeriod, "monthly");
  TestValidator.equals(
    "working hours per week matches",
    contract.workingHoursPerWeek,
    40,
  );
  TestValidator.equals(
    "notes match",
    contract.notes,
    "Initial employment contract",
  );
  TestValidator.equals("end date is null", contract.endDate, null);
  TestValidator.equals(
    "organization matches",
    contract.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "organization member matches",
    contract.organizationMember.id,
    orgMember.id,
  );
}
