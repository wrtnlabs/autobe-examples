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
import { generate_random_erp_hrm_admin_departments_create } from "../../../generate/generate_random_erp_hrm_admin_departments_create";
import { generate_random_erp_hrm_admin_employees_contracts_create } from "../../../generate/generate_random_erp_hrm_admin_employees_contracts_create";
import { generate_random_erp_hrm_admin_employees_create } from "../../../generate/generate_random_erp_hrm_admin_employees_create";
import { generate_random_erp_hrm_admin_roles_create } from "../../../generate/generate_random_erp_hrm_admin_roles_create";
import { prepare_random_erp_hrm_contract } from "../../../prepare/prepare_random_erp_hrm_contract";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_contract_termination_by_end_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create department for organizational context
  const department = await generate_random_erp_hrm_admin_departments_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(department);
  // 3. Create role with employee:manage permission
  const role = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        permissions: ["employee:manage", "employee:view"],
      },
    },
  );
  typia.assert(role);
  // 4. Create employee with invitation
  const invitation = await generate_random_erp_hrm_admin_employees_create(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        roleId: role.id,
        departmentId: department.id,
        employmentType: "full-time",
      },
    },
  );
  typia.assert(invitation);
  // Get employee ID from invitation response
  // The invitation may have an employee field or we use the invitation id
  const employeeId = (invitation as any).employee?.id ?? (invitation as any).id;
  TestValidator.equals("employeeId exists", !!employeeId, true);
  // 5. Create active contract with no end_date (ongoing)
  const now = new Date();
  const startDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  ).toISOString();
  const contract =
    await generate_random_erp_hrm_admin_employees_contracts_create(
      adminConnection,
      {
        params: { employeeId },
        body: {
          startDate: startDate,
          payRate: typia.random<number & tags.Minimum<0>>(),
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
        },
      },
    );
  typia.assert(contract);
  // Validate initial contract has no end_date (ongoing)
  TestValidator.equals(
    "contract has no end_date initially",
    contract.end_date,
    null,
  );
  // 6. Set end_date to terminate the contract (one month from start)
  const futureDate = new Date(startDate);
  futureDate.setMonth(futureDate.getMonth() + 1);
  const endDate = futureDate.toISOString();
  const updatedContract =
    await api.functional.erpHrm.admin.employees.contracts.update(
      adminConnection,
      {
        employeeId: employeeId,
        contractId: contract.id,
        body: {
          endDate: endDate,
        },
      },
    );
  typia.assert(updatedContract);
  // 7. Validate end_date is set correctly and is after start_date
  TestValidator.equals(
    "end_date is set correctly",
    updatedContract.endDate,
    endDate,
  );
  TestValidator.predicate(
    "end_date is after start_date",
    new Date(updatedContract.endDate!) > new Date(updatedContract.startDate),
  );
  // 8. Verify contract cannot be edited (immutability check - historical contract)
  await TestValidator.error(
    "historical contract cannot be edited",
    async () => {
      await api.functional.erpHrm.admin.employees.contracts.update(
        adminConnection,
        {
          employeeId: employeeId,
          contractId: contract.id,
          body: {
            payRate: 99999,
          },
        },
      );
    },
  );
}
