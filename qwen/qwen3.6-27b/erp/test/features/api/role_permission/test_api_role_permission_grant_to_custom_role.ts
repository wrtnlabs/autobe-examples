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
 * Test granting a specific permission to a custom role within an organization.
 *
 * Validates that organization owners can extend custom roles by adding discrete permission keys. Creates a custom role first, then grants the `time:approve` permission to it, verifying the API successfully creates a role-permission mapping record and returns the correct `IHrmPlatformRolePermission` response.
 *
 * 1. Authenticate a new member (who becomes organization owner by default on join).
 * 2. Create a custom role with an empty initial permission set.
 * 3. Grant the `time:approve` permission to the custom role.
 * 4. Validate the returned role-permission mapping includes the correct permission key and linked role summary.
 */
export async function test_api_role_permission_grant_to_custom_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member with organization context
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a custom role with no initial permissions
  const role = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        name: "Senior Developer",
        permissionKeys: [],
      },
    },
  );
  typia.assert(role);
  // 3. Grant time:approve permission to the custom role
  const permission =
    await generate_random_hrm_platform_member_roles_role_permissions_create(
      memberConnection,
      {
        params: { roleId: role.id },
        body: {
          permissionKey: "time:approve",
        } satisfies IHrmPlatformRolePermission.ICreate,
      },
    );
  typia.assert(permission);
  // 4. Validate response
  TestValidator.equals(
    "permission key is time:approve",
    permission.permission_key,
    "time:approve",
  );
  TestValidator.equals(
    "linked role id matches created role",
    permission.role.id,
    role.id,
  );
  TestValidator.equals(
    "linked role name matches created role",
    permission.role.name,
    role.name,
  );
  TestValidator.predicate(
    "role is custom (not built-in)",
    permission.role.builtIn === false,
  );
}
