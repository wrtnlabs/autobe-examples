import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that updating permissions on a built-in role is rejected.
 *
 * Validates the protection of platform default role permissions by attempting to modify the permission set of a built-in role (Owner, Manager, or Employee). The system must prevent any modifications to built-in role permissions to maintain platform security and consistency.
 *
 * 1. Member registers and establishes organization with default built-in roles.
 * 2. Member lists roles to identify a built-in role by its builtIn flag.
 * 3. Member attempts to update permissions of the built-in role.
 * 4. Validates that the update is rejected with 403 Forbidden.
 */
export async function test_api_role_permission_update_rejected_for_builtin_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member to establish organization with built-in roles
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, { body: {} });
  // 2. List built-in roles
  const roles = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: { builtIn: true } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(roles);
  // 3. Select first built-in role
  const builtInRole = typia.assert(roles.data[0]);
  // 4. Attempt to update permissions on built-in role - should be rejected
  await TestValidator.httpError(
    "built-in role permission update is rejected",
    403,
    async () => {
      const body = {
        permissionKeys: [
          "org:manage",
          "employee:manage",
        ] satisfies IHrmPlatformRole.IPermissionUpdate["permissionKeys"],
      } satisfies IHrmPlatformRole.IPermissionUpdate;
      await api.functional.hrmPlatform.member.roles.role_permissions.update(
        memberConnection,
        {
          roleId: builtInRole.id,
          body,
        },
      );
    },
  );
}
