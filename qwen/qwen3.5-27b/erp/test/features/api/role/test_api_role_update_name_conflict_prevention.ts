import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_hrm_platform_admin_roles_create } from "../../../generate/generate_random_hrm_platform_admin_roles_create";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";

/**
 * Test role name uniqueness constraint during update operation.
 * Verifies that attempting to update a role with a name that conflicts
 * with an existing role (built-in or custom) results in 409 Conflict error.
 */
export async function test_api_role_update_name_conflict_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Create a custom role with a unique name
  const customRole: IHrmPlatformRole =
    await generate_random_hrm_platform_admin_roles_create(adminConnection, {
      body: {
        name: `Custom Role ${RandomGenerator.alphabets(8)}`,
        description: "Test custom role for conflict prevention",
        permissions: ["employee_view", "project_view"],
      } satisfies IHrmPlatformRole.ICreate,
    });
  typia.assert(customRole);
  const originalRoleName: string = customRole.name;
  // 3. Attempt to update the role with a name that conflicts with built-in role 'Owner'
  await TestValidator.httpError(
    "should return 409 when updating role with existing built-in name",
    409,
    async () =>
      await api.functional.hrmPlatform.admin.roles.update(adminConnection, {
        roleId: customRole.id,
        body: {
          name: "Owner",
        } satisfies IHrmPlatformRole.IUpdate,
      }),
  );
  // 4. Attempt to update the role with a name that conflicts with built-in role 'Manager'
  await TestValidator.httpError(
    "should return 409 when updating role with existing built-in name Manager",
    409,
    async () =>
      await api.functional.hrmPlatform.admin.roles.update(adminConnection, {
        roleId: customRole.id,
        body: {
          name: "Manager",
        } satisfies IHrmPlatformRole.IUpdate,
      }),
  );
  // 5. Attempt to update the role with a name that conflicts with built-in role 'Employee'
  await TestValidator.httpError(
    "should return 409 when updating role with existing built-in name Employee",
    409,
    async () =>
      await api.functional.hrmPlatform.admin.roles.update(adminConnection, {
        roleId: customRole.id,
        body: {
          name: "Employee",
        } satisfies IHrmPlatformRole.IUpdate,
      }),
  );
  // 6. Verify the original role remains unchanged after failed updates
  const updatedRole: IHrmPlatformRole =
    await api.functional.hrmPlatform.admin.roles.update(adminConnection, {
      roleId: customRole.id,
      body: {
        description: "Updated description after conflict tests",
      } satisfies IHrmPlatformRole.IUpdate,
    });
  typia.assert(updatedRole);
  // 7. Validate that role name is unchanged
  TestValidator.equals(
    "role name should remain unchanged after failed conflict updates",
    updatedRole.name,
    originalRoleName,
  );
  // 8. Validate that role ID is unchanged
  TestValidator.equals(
    "role id should remain unchanged",
    updatedRole.id,
    customRole.id,
  );
}
