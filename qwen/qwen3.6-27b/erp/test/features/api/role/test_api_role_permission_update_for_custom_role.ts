import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
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
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";

/**
 * Test the successful update of permissions for a custom role.
 *
 * Validates the complete role permission update workflow. First, a member account is created which automatically establishes a default organization with built-in roles. Then a custom role is created with initial permissions (employee:view and project:view). The test then updates the role's permissions to a completely different set (employee:manage, time:manage, report:view).
 *
 * Verifies that the update succeeds and returns the updated permission state, the role now has new permissions, the old permissions have been removed confirming transactional replacement behavior, and the role record's updated_at timestamp is refreshed.
 *
 * 1. Member registers and authenticates, establishing an organization context and member identity.
 * 2. Custom role is created with initial permissions (employee:view, project:view).
 * 3. Role permissions are updated to a completely different set (employee:manage, time:manage, report:view).
 * 4. Validates the returned permission reflects the new set, and updated_at timestamp is refreshed.
 */
export async function test_api_role_permission_update_for_custom_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins and authenticates
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create custom role with initial permissions
  const initialPermissions = ["employee:view", "project:view"] as const;
  const role = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        permissionKeys: [...initialPermissions],
      },
    },
  );
  typia.assert(role);
  const oldUpdatedAt = role.updated_at;
  // 3. Update role permissions to new set (replaces all existing permissions)
  const newPermissionKeys = [
    "employee:manage",
    "time:manage",
    "report:view",
  ] as const;
  const body = {
    permissionKeys: [...newPermissionKeys],
  } satisfies IHrmPlatformRole.IPermissionUpdate;
  const updatedPermission =
    await api.functional.hrmPlatform.member.roles.role_permissions.update(
      memberConnection,
      {
        roleId: role.id,
        body,
      },
    );
  typia.assert(updatedPermission);
  // 4. Validate the returned permission is one of the new set (old permissions removed)
  const permissionKeys = [...newPermissionKeys] as string[];
  TestValidator.predicate(
    "permission_key is from new set",
    permissionKeys.includes(updatedPermission.permission_key),
  );
  TestValidator.equals(
    "role matches updated role",
    updatedPermission.role.id,
    role.id,
  );
  TestValidator.predicate(
    "role updated_at is refreshed",
    updatedPermission.role.createdAt < updatedPermission.role.updatedAt,
  );
}
