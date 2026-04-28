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
import { generate_random_hrm_platform_member_roles_role_permissions_create } from "../../../generate/generate_random_hrm_platform_member_roles_role_permissions_create";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";
import { prepare_random_hrm_platform_role_permission } from "../../../prepare/prepare_random_hrm_platform_role_permission";

/**
 * Test creating a duplicate role permission mapping.
 *
 * Validates that granting the same permission key to an existing custom role fails with a 409
 * Conflict error due to the database unique constraint on [hrm_platform_role_id, permission_key].
 * This protects the integrity of one-to-one role-permission mappings, ensuring each permission
 * can only be granted once per role.
 *
 * 1. Authenticate as a member with organization context.
 * 2. Create a custom role (e.g., 'Time Admin') with the `project:view` permission.
 * 3. Grant the `project:view` permission to the custom role.
 * 4. Attempt to grant the identical `project:view` permission again to the same role.
 * 5. Verify the second request fails with 409 Conflict error.
 */
export async function test_api_role_permission_duplicate_conflict(
  connection: api.IConnection,
) {
  // 1. Authenticate as member with organization context
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a custom role that will receive the permission grant
  const role = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        permissionKeys: [],
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(role);
  // 3. Grant `project:view` permission to the role
  const firstPermission =
    await api.functional.hrmPlatform.member.roles.role_permissions.create(
      memberConnection,
      {
        roleId: role.id,
        body: {
          permissionKey: "project:view",
        } satisfies IHrmPlatformRolePermission.ICreate,
      },
    );
  typia.assert(firstPermission);
  // 4. Attempt to grant the same permission again - this must fail with 409 Conflict
  await TestValidator.httpError(
    "duplicate permission mapping fails with 409 Conflict",
    409,
    async () => {
      await api.functional.hrmPlatform.member.roles.role_permissions.create(
        memberConnection,
        {
          roleId: role.id,
          body: {
            permissionKey: "project:view",
          } satisfies IHrmPlatformRolePermission.ICreate,
        },
      );
    },
  );
}
