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
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_admin_departments_create } from "../../../generate/generate_random_erp_hrm_admin_departments_create";
import { generate_random_erp_hrm_admin_employees_create } from "../../../generate/generate_random_erp_hrm_admin_employees_create";
import { generate_random_erp_hrm_admin_roles_create } from "../../../generate/generate_random_erp_hrm_admin_roles_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_employee_creation_existing_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create an admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://referrer.com",
    } satisfies IErpHrmAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create a custom role for the employee
  const customRole = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        permissions: ["employee:view", "project:view"] as (
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
  typia.assert(customRole);
  // 3. Create a department (optional but for completeness)
  const department = await generate_random_erp_hrm_admin_departments_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(department);
  // 4. Create a member account (existing user to be added as employee)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://referrer.com",
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(member);
  // 5. Create employee from the existing member
  const employeeOrInvitation =
    await api.functional.erpHrm.admin.employees.create(adminConnection, {
      body: {
        email: member.email satisfies string as string,
        roleId: customRole.id,
        departmentId: department.id,
        position: "Software Engineer",
        employmentType: "full-time",
      } satisfies IErpHrmEmployee.ICreate,
    });
  typia.assert(employeeOrInvitation);
  // Validation: Since the member exists, the response should be an invitation-like
  // record linking to the member. The email must match the member we created.
  TestValidator.equals(
    "email matches member",
    employeeOrInvitation.email,
    member.email satisfies string as string,
  );
  TestValidator.equals(
    "role is correctly assigned",
    employeeOrInvitation.role?.id,
    customRole.id,
  );
  TestValidator.equals(
    "department is correctly assigned",
    employeeOrInvitation.department?.id,
    department.id,
  );
  TestValidator.predicate(
    "organization exists",
    employeeOrInvitation.organization !== null &&
      employeeOrInvitation.organization !== undefined,
  );
  TestValidator.predicate(
    "invitation has valid status",
    ["pending", "accepted"].includes(employeeOrInvitation.status),
  );
}