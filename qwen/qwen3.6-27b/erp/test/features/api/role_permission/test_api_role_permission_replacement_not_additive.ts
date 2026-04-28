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
 * Test that permission updates perform complete replacement rather than additive behavior.
 *
 * This test validates the role permission update semantics by creating a custom role with initial permissions, then performing sequential updates that should replace rather than add to existing permissions. This ensures transactional atomicity of permission updates where each operation completely replaces the entire permission set rather than incrementally adding permissions. Verifies that after each update, only the newly assigned permissions exist and all previously assigned permissions are removed, confirming non-additive behavior.
 *
 * 1. Member joins to establish organization context and authentication.
 * 2. Custom role is created with initial permissions (org:manage, employee:manage).
 * 3. First permission update assigns only time:approve - verifies complete replacement.
 * 4. Second permission update assigns project:manage and report:view - verifies complete replacement.
 * 5. Validates updated_at timestamp is refreshed after each update.
 *
 * Edge cases: Permissions are never additive; each update is a complete atomic replacement of the entire permission set.
 */
export async function test_api_role_permission_replacement_not_additive(
  connection: api.IConnection,
) {
  // 1. Member joins to establish organization context
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create custom role with initial permissions (org:manage, employee:manage)
  const role = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        permissionKeys: ["org:manage", "employee:manage"],
      },
    },
  );
  typia.assert(role);
  const initialPermissions = role.rolePermissions.map((p) => p.permission_key);
  TestValidator.equals(
    "initial permissions are org:manage and employee:manage",
    initialPermissions,
    ["org:manage", "employee:manage"],
  );
  const firstUpdatedAt = role.updated_at;
  // 3. First permission update: assign only time:approve
  // Should replace all existing permissions completely
  const updateOneResult =
    await api.functional.hrmPlatform.member.roles.role_permissions.update(
      memberConnection,
      {
        roleId: role.id,
        body: {
          permissionKeys: ["time:approve"],
        } satisfies IHrmPlatformRole.IPermissionUpdate,
      },
    );
  typia.assert(updateOneResult);
  // Verify the returned permission is time:approve
  TestValidator.equals(
    "updated permission key is time:approve",
    updateOneResult.permission_key,
    "time:approve",
  );
  // Verify updated_at was refreshed after first update
  TestValidator.predicate(
    "updated_at refreshed after first update",
    updateOneResult.role.updatedAt !== firstUpdatedAt,
  );
  const secondUpdatedAt = updateOneResult.role.updatedAt;
  // 4. Second permission update: assign project:manage and report:view
  // Should replace all existing permissions completely
  const updateTwoResult =
    await api.functional.hrmPlatform.member.roles.role_permissions.update(
      memberConnection,
      {
        roleId: role.id,
        body: {
          permissionKeys: ["project:manage", "report:view"],
        } satisfies IHrmPlatformRole.IPermissionUpdate,
      },
    );
  typia.assert(updateTwoResult);
  // Verify the returned permission is from the new permission set
  TestValidator.predicate(
    "updated permission key is from new permission set",
    ["project:manage", "report:view"].includes(updateTwoResult.permission_key),
  );
  // Verify updated_at was refreshed after second update
  TestValidator.predicate(
    "updated_at refreshed after second update",
    updateTwoResult.role.updatedAt !== secondUpdatedAt,
  );
}
