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
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
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
import { generate_random_erp_hrm_admin_roles_create } from "../../../generate/generate_random_erp_hrm_admin_roles_create";
import { prepare_random_erp_hrm_contract } from "../../../prepare/prepare_random_erp_hrm_contract";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_contract_retrieval_by_owning_employee(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create organization
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {},
  );
  typia.assert(organization);
  // 3. Create custom role with employee:view permission
  const role = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        permissions: ["employee:view"],
      },
    },
  );
  typia.assert(role);
  // 4. Create employee with the created role
  const employeeEmail = typia.random<string & tags.Format<"email">>();
  const employee = await generate_random_erp_hrm_admin_employees_create(
    adminConnection,
    {
      body: {
        email: employeeEmail,
        roleId: role.id,
        employmentType: "full-time",
      },
    },
  );
  typia.assert(employee);
  // 5. Create contract for the employee with specific values for validation
  const payRate = 75000;
  const payPeriod: "hourly" | "daily" | "weekly" | "monthly" = "monthly";
  const workingHoursPerWeek = 40;
  const contract =
    await generate_random_erp_hrm_admin_employees_contracts_create(
      adminConnection,
      {
        params: {
          employeeId: employee.id,
        },
        body: {
          startDate: new Date().toISOString(),
          payRate: payRate,
          payPeriod: payPeriod,
          workingHoursPerWeek: workingHoursPerWeek,
          notes: "Test contract notes",
        },
      },
    );
  typia.assert(contract);
  // 6. Retrieve the contract using the at endpoint
  const retrievedContract =
    await api.functional.erpHrm.admin.employees.contracts.at(adminConnection, {
      employeeId: employee.id,
      contractId: contract.id,
    });
  typia.assert(retrievedContract);
  // 7. Validate response contains all contract fields
  TestValidator.equals(
    "contract id matches",
    retrievedContract.id,
    contract.id,
  );
  TestValidator.equals(
    "start date matches",
    retrievedContract.startDate,
    contract.start_date,
  );
  TestValidator.equals(
    "end date matches",
    retrievedContract.endDate,
    contract.end_date,
  );
  TestValidator.equals(
    "notes matches",
    retrievedContract.notes,
    contract.notes,
  );
  // 8. Validate employee object matches
  TestValidator.equals(
    "employee id matches",
    retrievedContract.employee.id,
    employee.id,
  );
  // 9. Validate pay details match submitted values
  TestValidator.equals("pay rate matches", retrievedContract.payRate, payRate);
  TestValidator.equals(
    "pay period matches",
    retrievedContract.payPeriod,
    payPeriod,
  );
  TestValidator.equals(
    "working hours per week matches",
    retrievedContract.workingHoursPerWeek,
    workingHoursPerWeek,
  );
  // 10. Validate timestamps exist
  TestValidator.predicate(
    "has createdAt",
    retrievedContract.createdAt !== undefined,
  );
  TestValidator.predicate(
    "has updatedAt",
    retrievedContract.updatedAt !== undefined,
  );
}
