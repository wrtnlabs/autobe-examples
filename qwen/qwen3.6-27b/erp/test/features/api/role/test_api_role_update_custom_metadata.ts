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
 * Test custom role metadata update workflow for the ERP HRM platform.
 *
 * Validates the complete role update flow including member authentication, custom role creation, and metadata updates. Ensures that roles can have their name and description fields updated while maintaining their core identity and permissions.
 *
 * Special attention is given to verifying that the updated role preserves its original ID, permissions, and built-in status, while correctly updating only the specified metadata fields.
 *
 * 1. Member registers and authenticates with default organization.
 * 2. Member creates custom role 'Team Lead' with employee:view and project:view permissions.
 * 3. Member updates role metadata with new name 'Senior Team Lead' and/or description.
 * 4. Validates updated role maintains correct structure and properties.
 */
export async function test_api_role_update_custom_metadata(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create custom role
  const role = await generate_random_hrm_platform_member_roles_create(
    memberConnection,
    {
      body: {
        name: "Team Lead",
        description: "Role for team members leading small teams",
        permissionKeys: ["employee:view", "project:view"],
      } satisfies IHrmPlatformRole.ICreate,
    },
  );
  typia.assert(role);
  // 3. Capture original values
  const originalCreatedAt = role.created_at;
  const originalId = role.id;
  const originalPermissions = role.rolePermissions;
  // 4. Update role with new metadata
  const updatedRole = await api.functional.hrmPlatform.member.roles.update(
    memberConnection,
    {
      roleId: role.id,
      body: {
        name: "Senior Team Lead",
        description: "Elevated role for senior team members",
      } satisfies IHrmPlatformRole.IUpdate,
    },
  );
  typia.assert(updatedRole);
  // 5. Validate updated role
  TestValidator.equals("name updated", updatedRole.name, "Senior Team Lead");
  TestValidator.equals(
    "description updated",
    updatedRole.description,
    "Elevated role for senior team members",
  );
  TestValidator.equals("id unchanged", updatedRole.id, originalId);
  TestValidator.predicate(
    "has same permissions count",
    originalPermissions.length === updatedRole.rolePermissions.length,
  );
  TestValidator.equals(
    "permissions unchanged",
    originalPermissions.map((p) => p.permission_key).sort(),
    updatedRole.rolePermissions.map((p) => p.permission_key).sort(),
  );
  TestValidator.predicate(
    "built_in remains false",
    updatedRole.built_in === false,
  );
  TestValidator.predicate(
    "created_at unchanged",
    originalCreatedAt === updatedRole.created_at,
  );
  TestValidator.notEquals(
    "updated_at changed",
    originalCreatedAt,
    updatedRole.updated_at,
  );
}
