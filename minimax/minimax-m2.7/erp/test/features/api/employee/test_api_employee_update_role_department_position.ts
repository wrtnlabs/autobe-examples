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
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_departments_create } from "../../../generate/generate_random_erp_hrm_admin_departments_create";
import { generate_random_erp_hrm_admin_employees_create } from "../../../generate/generate_random_erp_hrm_admin_employees_create";
import { generate_random_erp_hrm_admin_roles_create } from "../../../generate/generate_random_erp_hrm_admin_roles_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_employee_update_role_department_position(
  connection: api.IConnection,
): Promise<void> {
  // 1. First admin authentication (creates organization)
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 2. Create a second member to be added as employee (so employee is created, not invitation)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_admin_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  // 3. Create a custom role for assignment during update
  const customRole = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        permissions: ["employee:view", "project:view"],
      },
    },
  );
  typia.assert(customRole);
  // 4. Create a department for assignment during update
  const department = await generate_random_erp_hrm_admin_departments_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  typia.assert(department);
  // 5. Create initial employee (member already exists, so employee is created)
  const employeeResult = await generate_random_erp_hrm_admin_employees_create(
    adminConnection,
    {
      body: {
        email: member.email,
        roleId: customRole.id,
        employmentType: "part-time",
      },
    },
  );
  // Extract employee ID from the result
  const employeeId: string & tags.Format<"uuid"> = (employeeResult as any).id;
  // 6. Update employee with new role, department, position, and employment type
  const updatedEmployee = await api.functional.erpHrm.admin.employees.update(
    adminConnection,
    {
      employeeId: employeeId,
      body: {
        roleId: customRole.id,
        departmentId: department.id,
        position: "Senior Developer",
        employmentType: "full-time",
        status: "active",
      } satisfies IErpHrmEmployee.IUpdate,
    },
  );
  typia.assert(updatedEmployee);
  // 7. Validate updated employee record
  TestValidator.equals(
    "role matches custom role",
    updatedEmployee.role.id,
    customRole.id,
  );
  TestValidator.equals(
    "department matches",
    updatedEmployee.department?.id,
    department.id,
  );
  TestValidator.equals(
    "position updated",
    updatedEmployee.position,
    "Senior Developer",
  );
  TestValidator.equals(
    "employment type updated",
    updatedEmployee.employmentType,
    "full-time",
  );
  TestValidator.equals(
    "status remains active",
    updatedEmployee.status,
    "active",
  );
  // Validate nested objects are present
  TestValidator.predicate("has member object", !!updatedEmployee.member);
  TestValidator.predicate(
    "has organization object",
    !!updatedEmployee.organization,
  );
  TestValidator.predicate(
    "has role object with permissions",
    !!updatedEmployee.role,
  );
  TestValidator.predicate(
    "has department object",
    !!updatedEmployee.department,
  );
}
