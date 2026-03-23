import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_hrm_platform_admin_roles_create } from "../../../generate/generate_random_hrm_platform_admin_roles_create";
import { generate_random_hrm_platform_admin_roles_permissions_create } from "../../../generate/generate_random_hrm_platform_admin_roles_permissions_create";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";
import { prepare_random_hrm_platform_role_permission } from "../../../prepare/prepare_random_hrm_platform_role_permission";

/**
 * Test adding a permission to a custom role in the HRM Platform.
 *
 * This test validates the complete workflow of granting a permission to a
 * custom role, including role creation, permission assignment, and response
 * validation. It ensures that permissions are correctly associated with roles
 * and that the response contains all required fields with proper values.
 */
export async function test_api_role_permission_add_to_custom_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a custom role with no initial permissions
  const role: IHrmPlatformRole =
    await generate_random_hrm_platform_admin_roles_create(adminConnection, {
      body: {
        name: "Senior Developer",
        description: "Custom role for senior development staff",
        permissions: [],
      },
    });
  typia.assert(role);
  // Verify role was created with empty permissions
  TestValidator.equals("role name matches", role.name, "Senior Developer");
  TestValidator.equals("initial permission count", role.permissions.length, 0);
  TestValidator.predicate("role has valid ID", role.id.length > 0);
  // 3. Add permission to the custom role
  const permission: IHrmPlatformRolePermission =
    await generate_random_hrm_platform_admin_roles_permissions_create(
      adminConnection,
      {
        params: {
          roleId: role.id,
        },
        body: {
          permission_code: "project:manage",
        },
      },
    );
  typia.assert(permission);
  // 4. Validate the permission response
  TestValidator.equals(
    "permission code matches request",
    permission.permission_code,
    "project:manage",
  );
  TestValidator.equals("role ID matches", permission.role.id, role.id);
  TestValidator.equals(
    "role name in permission",
    permission.role.name,
    "Senior Developer",
  );
  TestValidator.predicate("permission has valid ID", permission.id.length > 0);
  TestValidator.predicate(
    "created_at is valid datetime",
    permission.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    permission.updated_at.length > 0,
  );
  TestValidator.equals("deleted_at is null", permission.deleted_at, null);
}
