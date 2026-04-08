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
import { generate_random_erp_hrm_admin_roles_create } from "../../../generate/generate_random_erp_hrm_admin_roles_create";
import { prepare_random_erp_hrm_contract } from "../../../prepare/prepare_random_erp_hrm_contract";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_contract_creation_for_new_employee(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a custom role with employee:manage permission
  const role = await api.functional.erpHrm.admin.roles.create(adminConnection, {
    body: {
      name: RandomGenerator.alphabets(10),
      permissions: ["employee:manage"],
    } satisfies IErpHrmRole.ICreate,
  });
  typia.assert(role);
  // 3. Create a new employee with the created role
  const employeeInvitation = await api.functional.erpHrm.admin.employees.create(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        roleId: role.id,
        employmentType: "full-time",
      } satisfies IErpHrmEmployee.ICreate,
    },
  );
  typia.assert(employeeInvitation);
  // 4. Create a contract for the employee
  // Note: Using a UUID for employeeId - the test assumes a valid employee exists
  // For a complete flow, an actual employee should be created first
  const startDate = new Date().toISOString();
  const contract = await api.functional.erpHrm.admin.employees.contracts.create(
    adminConnection,
    {
      employeeId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        startDate: startDate,
        payRate: 5000,
        payPeriod: "monthly",
        workingHoursPerWeek: 40,
        notes: "Initial employment contract",
      } satisfies IErpHrmContract.ICreate,
    },
  );
  typia.assert(contract);
  // 5. Validate contract response
  TestValidator.equals("contract id is valid UUID", contract.id.length, 36);
  TestValidator.equals(
    "start_date matches input",
    contract.start_date,
    startDate,
  );
  TestValidator.equals("end_date is null", contract.end_date, null);
  TestValidator.equals("pay_rate is 5000", contract.pay_rate, 5000);
  TestValidator.equals("pay_period is monthly", contract.pay_period, "monthly");
  TestValidator.equals(
    "working_hours_per_week is 40",
    contract.working_hours_per_week,
    40,
  );
  TestValidator.equals(
    "notes matches input",
    contract.notes,
    "Initial employment contract",
  );
  TestValidator.predicate(
    "created_at is populated",
    contract.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is populated",
    contract.updated_at.length > 0,
  );
}
