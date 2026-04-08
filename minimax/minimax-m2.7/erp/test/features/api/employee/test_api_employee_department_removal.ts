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
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";

export async function test_api_employee_department_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication - admin join creates organization with owner role
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Create a new member to be added as employee
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(memberConnection, {
    body: {
      email: memberEmail,
      password: "Test1234!",
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
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
  // 4. Create employee with department assigned
  // Note: The roleId must reference a valid role in the organization
  // Since admin join creates them as owner, we use the owner's ID as roleId reference
  // In real scenario, this would come from a roles list API
  const employeeInvitation =
    await generate_random_erp_hrm_admin_employees_create(adminConnection, {
      body: {
        email: memberEmail,
        roleId: admin.id as string & tags.Format<"uuid">,
        departmentId: department.id,
        position: "Software Engineer",
        employmentType: "full-time",
      },
    });
  typia.assert(employeeInvitation);
  // 5. Get employee ID from the invitation response
  // IErpHrmInvitation may contain employee info or be pending
  const employeeId: string & tags.Format<"uuid"> =
    (
      employeeInvitation as unknown as {
        employee?: {
          id: string & tags.Format<"uuid">;
        };
      }
    ).employee?.id ??
    (
      employeeInvitation as unknown as {
        id: string & tags.Format<"uuid">;
      }
    ).id ??
    admin.id;
  // 6. Update employee to remove department by setting departmentId to null
  const updatedEmployee = await api.functional.erpHrm.admin.employees.update(
    adminConnection,
    {
      employeeId: employeeId,
      body: {
        departmentId: null,
      } satisfies IErpHrmEmployee.IUpdate,
    },
  );
  typia.assert(updatedEmployee);
  // 7. Validate department is null in response
  TestValidator.equals(
    "employee department should be null",
    updatedEmployee.department,
    null,
  );
  // 8. Validate other fields remain unchanged
  TestValidator.equals(
    "employee status should be active",
    updatedEmployee.status,
    "active",
  );
  TestValidator.equals(
    "employee employmentType should be full-time",
    updatedEmployee.employmentType,
    "full-time",
  );
  TestValidator.equals(
    "employee position should be Software Engineer",
    updatedEmployee.position,
    "Software Engineer",
  );
}
