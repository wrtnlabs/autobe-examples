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

export async function test_api_role_permission_not_found(
  connection: api.IConnection,
) {
  // 1. Authenticate as a member to establish organization context
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Create a custom role within the organization
  const role = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: typia.random<string | null>(),
        permissionKeys: [],
      },
    },
  );
  typia.assert(role);
  // 3. Grant a permission to the role, creating a valid role-permission mapping
  const existingPermission =
    await generate_random_hrm_platform_member_roles_role_permissions_create(
      memberConnection,
      {
        body: {
          permissionKey: "project:view",
        },
        params: {
          roleId: role.id,
        },
      },
    );
  typia.assert(existingPermission);
  // 4. Generate a fabricated rolePermissionId that does not exist in the database
  const fakeRolePermissionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 5. Validate that retrieving a non-existent role-permission returns 404 Not Found
  await TestValidator.error(
    "should return 404 for non-existent role-permission",
    async () =>
      await api.functional.hrmPlatform.member.roles.role_permissions.at(
        memberConnection,
        {
          roleId: role.id,
          rolePermissionId: fakeRolePermissionId,
        },
      ),
  );
}
