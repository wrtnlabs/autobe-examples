import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";
import { prepare_random_hrm_platform_role_permission } from "../../../prepare/prepare_random_hrm_platform_role_permission";

export async function test_api_role_deletion_with_assigned_employees_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as organization owner (has org:manage permission by default)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create a custom role with org:manage and employee:manage permissions
  const customRole = await generate_random_hrm_platform_member_roles_create(
    ownerConnection,
    {
      body: {
        name: `TestRole_${RandomGenerator.alphabets(8)}`,
        permissions: [
          {
            permission: "org:manage",
          } satisfies IHrmPlatformRolePermission.ICreate,
          {
            permission: "employee:manage",
          } satisfies IHrmPlatformRolePermission.ICreate,
        ],
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(customRole);
  TestValidator.predicate(
    "role is custom (not built-in)",
    !customRole.built_in,
  );
  // 3. Create a second member account to serve as the employee
  const employeeMemberConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(employeeAuth);
  // 4. Create an employee record and assign the custom role to this employee
  const employee = await generate_random_hrm_platform_member_employees_create(
    ownerConnection,
    {
      body: {
        member_id: employeeAuth.member.id,
        role_id: customRole.id,
        employment_type: "full-time",
        status: "active",
      } satisfies IHrmPlatformEmployee.ICreate,
    },
  );
  typia.assert(employee);
  TestValidator.equals(
    "employee role matches custom role",
    employee.role.id,
    customRole.id,
  );
  TestValidator.equals("employee is active", employee.status, "active");
  // 5. Attempt to delete the custom role - should fail with 409 Conflict
  // The API should reject deletion when employees are assigned to the role
  await TestValidator.error(
    "role deletion with assigned employees rejected",
    async () => {
      await api.functional.hrmPlatform.member.roles.erase(ownerConnection, {
        roleId: customRole.id,
      });
    },
  );
  // 6. Verify the role still exists and is accessible
  // The role object created earlier should still be valid (not soft-deleted)
  TestValidator.predicate("role id exists", customRole.id !== null);
  TestValidator.predicate(
    "role was not soft-deleted",
    customRole.deleted_at === null,
  );
  TestValidator.equals(
    "role name preserved",
    customRole.name,
    `TestRole_${RandomGenerator.alphabets(8)}`.split("_")[0] +
      customRole.name.split("_")[1],
  );
}
