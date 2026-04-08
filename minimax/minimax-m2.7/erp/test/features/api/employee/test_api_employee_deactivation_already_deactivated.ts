import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
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
import { generate_random_erp_hrm_admin_employees_create } from "../../../generate/generate_random_erp_hrm_admin_employees_create";
import { generate_random_erp_hrm_admin_roles_create } from "../../../generate/generate_random_erp_hrm_admin_roles_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_employee_deactivation_already_deactivated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 2. Create role for employee
  const role = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: `Test Role ${RandomGenerator.alphaNumeric(8)}`,
        permissions: ["employee:manage", "employee:view"],
      } satisfies IErpHrmRole.ICreate,
    },
  );
  // 3. Create employee to be deactivated twice
  const employee = await generate_random_erp_hrm_admin_employees_create(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        roleId: role.id,
        employmentType: "full-time",
      } satisfies IErpHrmEmployee.ICreate,
    },
  );
  // 4. First DELETE - deactivate the employee (success)
  await api.functional.erpHrm.admin.employees.erase(adminConnection, {
    employeeId: employee.id,
  });
  // 5. Second DELETE - attempt to deactivate already deactivated employee (should error)
  await TestValidator.error(
    "already deactivated employee cannot be deactivated again",
    async () => {
      await api.functional.erpHrm.admin.employees.erase(adminConnection, {
        employeeId: employee.id,
      });
    },
  );
}
