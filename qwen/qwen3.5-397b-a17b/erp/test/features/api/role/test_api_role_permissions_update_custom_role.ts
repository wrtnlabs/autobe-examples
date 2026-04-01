import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_hrm_platform_member_roles_create } from "../../../generate/generate_random_hrm_platform_member_roles_create";
import { prepare_random_hrm_platform_role } from "../../../prepare/prepare_random_hrm_platform_role";

export async function test_api_role_permissions_update_custom_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member by joining the platform
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a custom role with initial permissions (employee:view, project:view)
  const initialRole = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        permissions: ["employee:view", "project:view"],
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(initialRole);
  // Verify initial role is custom (not built-in)
  TestValidator.predicate("role is custom", !initialRole.is_builtin);
  TestValidator.equals(
    "initial permission count",
    initialRole.permissions.length,
    2,
  );
  // 3. Update the role's permissions to a different set
  const updatedPermission =
    await api.functional.hrmPlatform.member.roles.permissions.updatePermissions(
      memberConnection,
      {
        roleId: initialRole.id,
        body: {
          permissionCodes: [
            "employee:manage",
            "project:manage",
            "time:approve",
          ],
        } satisfies IHrmPlatformRole.IPermissionsUpdate,
      },
    );
  typia.assert(updatedPermission);
  // 4. Verify the response contains a valid permission assignment
  TestValidator.predicate(
    "permission has valid id",
    updatedPermission.id.length > 0,
  );
  TestValidator.predicate(
    "permission code is from new set",
    ["employee:manage", "project:manage", "time:approve"].includes(
      updatedPermission.permission,
    ),
  );
  TestValidator.equals(
    "permission belongs to same role",
    updatedPermission.role.id,
    initialRole.id,
  );
}
