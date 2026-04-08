import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_employees_contracts_create } from "../../../generate/generate_random_erp_hrm_admin_employees_contracts_create";
import { generate_random_erp_hrm_admin_employees_create } from "../../../generate/generate_random_erp_hrm_admin_employees_create";
import { generate_random_erp_hrm_admin_organizations_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_create";
import { prepare_random_erp_hrm_contract } from "../../../prepare/prepare_random_erp_hrm_contract";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_organization_deletion_with_active_contracts(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create a new organization
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {},
  );
  typia.assert(organization);
  // 3. Create a second admin who will become an employee
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAdmin = await authorize_admin_join(employeeConnection, {});
  typia.assert(employeeAdmin);
  // 4. Create an employee in the organization using the second admin's email
  const invitation = await generate_random_erp_hrm_admin_employees_create(
    adminConnection,
    {
      body: {
        email: employeeAdmin.email,
        roleId: organization.owner.id,
        employmentType: "full-time",
      } satisfies IErpHrmEmployee.ICreate,
    },
  );
  typia.assert(invitation);
  // Get the employee ID from the invitation response
  // When the user already exists, the employee is created immediately
  const employeeId = (invitation as any).employee?.id ?? organization.owner.id;
  // 5. Create an active contract with no end_date (ongoing contract)
  const contract =
    await generate_random_erp_hrm_admin_employees_contracts_create(
      adminConnection,
      {
        params: {
          employeeId: employeeId,
        },
        body: {
          startDate: new Date().toISOString(),
          payRate: 5000,
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
          endDate: null,
        } satisfies IErpHrmContract.ICreate,
      },
    );
  typia.assert(contract);
  // Validate contract has no end date (active)
  TestValidator.equals(
    "contract should be active with null end date",
    contract.end_date,
    null,
  );
  // 6. Attempt to delete the organization - should fail with 400
  await TestValidator.httpError(
    "organization deletion should fail with active contracts",
    400,
    async () => {
      await api.functional.erpHrm.admin.organizations.erase(adminConnection, {
        organizationId: organization.id,
      });
    },
  );
}
