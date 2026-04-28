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

export async function test_api_role_permission_removal_from_unassigned_custom_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member (which creates an organization with the member as owner)
  const auth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(auth);
  // Create actor-specific connection for the authenticated member
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${auth.token.access}` },
  };
  // 2. Create a custom role (e.g., 'Time Viewer') with initial permissions such as ['time:view_all']
  const role = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        name: "Time Viewer",
        description: null,
        permissionKeys: ["time:view_all"],
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(role);
  // 3. Add an additional permission (e.g., 'report:view') to the custom role via the role-permissions create endpoint
  const permission =
    await generate_random_hrm_platform_member_roles_role_permissions_create(
      memberConnection,
      {
        params: { roleId: role.id },
        body: {
          permissionKey: "report:view",
        } satisfies IHrmPlatformRolePermission.ICreate,
      },
    );
  typia.assert(permission);
  // 4. Call DELETE on the specific role-permission mapping (using the role's roleId and the newly created rolePermissionId for 'report:view')
  await api.functional.hrmPlatform.member.roles.role_permissions.erase(
    memberConnection,
    {
      roleId: role.id,
      rolePermissionId: permission.id,
    },
  );
}
