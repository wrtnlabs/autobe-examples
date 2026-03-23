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

export async function test_api_role_permission_retrieve_existing(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test retrieving a specific permission assignment from a custom role.
   * 1. Admin joins and authenticates
   * 2. Creates a custom role with permissions
   * 3. Adds employee_manage permission to the role
   * 4. Retrieves the specific permission by role ID and permission code
   * 5. Validates the permission details and role reference
   */
  // 1. Admin authentication
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
  // 2. Create a custom role with permissions
  const role: IHrmPlatformRole =
    await generate_random_hrm_platform_admin_roles_create(adminConnection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        permissions: ["employee_view", "project_view"],
      } satisfies IHrmPlatformRole.ICreate,
    });
  typia.assert(role);
  // 3. Add employee_manage permission to the role
  const permission: IHrmPlatformRolePermission =
    await generate_random_hrm_platform_admin_roles_permissions_create(
      adminConnection,
      {
        params: {
          roleId: role.id,
        },
        body: {
          permission_code: "employee_manage",
        } satisfies IHrmPlatformRolePermission.ICreate,
      },
    );
  typia.assert(permission);
  // 4. Retrieve the specific permission by role ID and permission code
  const retrieved: IHrmPlatformRolePermission =
    await api.functional.hrmPlatform.admin.roles.permissions.at(
      adminConnection,
      {
        roleId: role.id,
        permissionCode: "employee_manage",
      },
    );
  typia.assert(retrieved);
  // 5. Validate the permission details
  TestValidator.equals(
    "permission code matches",
    retrieved.permission_code,
    "employee_manage",
  );
  TestValidator.equals("role ID matches", retrieved.role.id, role.id);
  TestValidator.equals("role name matches", retrieved.role.name, role.name);
  TestValidator.predicate(
    "created_at is valid",
    retrieved.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid",
    retrieved.updated_at.length > 0,
  );
  TestValidator.equals("deleted_at is null", retrieved.deleted_at, null);
  TestValidator.predicate(
    "organization exists",
    retrieved.role.organization.id.length > 0,
  );
}
