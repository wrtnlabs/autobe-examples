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

export async function test_api_contract_deletion_rejected_historical_contract(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a role for the employee
  const role = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        permissions: ["employee:manage", "employee:view"] as (
          | "org:manage"
          | "employee:manage"
          | "employee:view"
          | "project:manage"
          | "project:view"
          | "time:manage"
          | "time:approve"
          | "time:view_all"
          | "report:view"
        )[],
      } satisfies IErpHrmRole.ICreate,
    },
  );
  typia.assert(role);
  // 3. Create a department
  const department = await generate_random_erp_hrm_admin_departments_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IErpHrmDepartment.ICreate,
    },
  );
  typia.assert(department);
  // 4. Create an employee (returns IErpHrmInvitation)
  const employeeInvitation =
    await generate_random_erp_hrm_admin_employees_create(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        roleId: role.id,
        departmentId: department.id,
        employmentType: "full-time",
      } satisfies IErpHrmEmployee.ICreate,
    });
  typia.assert(employeeInvitation);
  // 5. Get the employee ID from the invitation response
  // The invitation ID is used as the employee reference for contract operations
  const employeeId: string & tags.Format<"uuid"> = employeeInvitation.id;
  // 6. Create a contract with a past end date (historical contract)
  const now = new Date();
  const pastStartDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
  const pastEndDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const contract =
    await generate_random_erp_hrm_admin_employees_contracts_create(
      adminConnection,
      {
        params: {
          employeeId: employeeId,
        },
        body: {
          startDate: pastStartDate.toISOString(),
          endDate: pastEndDate.toISOString(),
          payRate: typia.random<number & tags.Minimum<0>>(),
          payPeriod: "monthly",
          workingHoursPerWeek: 40,
        } satisfies IErpHrmContract.ICreate,
      },
    );
  typia.assert(contract);
  // 7. Validate that the contract has a past end date (historical contract)
  TestValidator.equals(
    "contract has past end date",
    contract.end_date !== null,
    true,
  );
  const endDate = new Date(contract.end_date!);
  TestValidator.predicate("end date is in the past", endDate < now);
  // 8. Attempt to delete the historical contract - this should be rejected
  await TestValidator.error(
    "historical contract deletion should be rejected",
    async () => {
      await api.functional.erpHrm.admin.employees.contracts.erase(
        adminConnection,
        {
          employeeId: employeeId,
          contractId: contract.id,
        },
      );
    },
  );
}
