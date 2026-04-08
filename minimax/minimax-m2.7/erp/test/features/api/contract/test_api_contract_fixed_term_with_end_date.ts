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

export async function test_api_contract_fixed_term_with_end_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Create a role with employee:manage permission
  const role = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        permissions: ["employee:manage"] as (
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
      },
    },
  );
  typia.assert(role);
  // 3. Create a department
  const department = await generate_random_erp_hrm_admin_departments_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(department);
  // 4. Create an employee with contractor employment type
  // Using admin's email so the employee is created immediately (member exists)
  const employee = await api.functional.erpHrm.admin.employees.create(
    adminConnection,
    {
      body: {
        email: authorized.email,
        roleId: role.id,
        departmentId: department.id,
        employmentType: "contractor",
      } satisfies IErpHrmEmployee.ICreate,
    },
  );
  typia.assert(employee);
  // Extract employee ID from the response
  // In simulation mode, typia.random generates valid UUIDs
  const employeeId: string & tags.Format<"uuid"> =
    (
      employee as unknown as {
        employee?: {
          id: string;
        };
      }
    ).employee?.id ??
    ((
      employee as unknown as {
        member?: {
          id: string;
        };
      }
    ).member!.id as string & tags.Format<"uuid">);
  // 5. Create a fixed-term contract with end date
  const contract = await api.functional.erpHrm.admin.employees.contracts.create(
    adminConnection,
    {
      employeeId: employeeId,
      body: {
        startDate: "2024-01-01T00:00:00.000Z" as string &
          tags.Format<"date-time">,
        endDate: "2024-12-31T00:00:00.000Z" as string &
          tags.Format<"date-time">,
        payRate: 100,
        payPeriod: "hourly",
        workingHoursPerWeek: 20,
        notes: "Short-term contractor agreement",
      } satisfies IErpHrmContract.ICreate,
    },
  );
  typia.assert(contract);
  // Validations
  TestValidator.equals(
    "contract has end date",
    contract.end_date !== null,
    true,
  );
  TestValidator.equals(
    "end date is 2024-12-31",
    contract.end_date?.substring(0, 10),
    "2024-12-31",
  );
  TestValidator.equals("pay period is hourly", contract.pay_period, "hourly");
  TestValidator.equals(
    "working hours per week is 20",
    contract.working_hours_per_week,
    20,
  );
  TestValidator.equals(
    "start date is 2024-01-01",
    contract.start_date.substring(0, 10),
    "2024-01-01",
  );
}
