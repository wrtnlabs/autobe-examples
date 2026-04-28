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
 * Test creating a custom role with minimal configuration: no description and a single permission key.
 *
 * Validates that the system correctly handles role creation when only required fields are provided. The description field is optional and should default to null when omitted. Tests that a role can be created with the minimum viable permission set containing just one permission key.
 *
 * 1. Authenticate as a new member, which creates the default organization context.
 * 2. Create a custom role with a unique name, no description, and a single permission key 'employee:view'.
 * 3. Validate the created role has description set to null, built_in set to false, and exactly one permission mapping.
 * 4. Verify the permission key matches the input and all timestamps are properly populated.
 */
export async function test_api_role_create_minimal_without_description(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member (creates default organization)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create role with minimal configuration: no description, single permission
  const roleName = `Employee Viewer-${RandomGenerator.alphabets(6)}`;
  const body = {
    name: roleName,
    permissionKeys: ["employee:view"],
  } satisfies IHrmPlatformRole.ICreate;
  const createdRole = await api.functional.hrmPlatform.member.roles.create(
    memberConnection,
    { body },
  );
  typia.assert(createdRole);
  // 3. Validate role properties
  TestValidator.equals("role name matches input", createdRole.name, roleName);
  TestValidator.equals("description is null", createdRole.description, null);
  TestValidator.predicate(
    "built_in is false for custom role",
    createdRole.built_in === false,
  );
  TestValidator.predicate(
    "created_at timestamp is set",
    createdRole.created_at !== null && createdRole.created_at !== "",
  );
  TestValidator.predicate(
    "updated_at timestamp is set",
    createdRole.updated_at !== null && createdRole.updated_at !== "",
  );
  TestValidator.equals("deleted_at is null", createdRole.deleted_at, null);
  // 4. Validate permission array
  TestValidator.equals(
    "role has exactly one permission",
    createdRole.rolePermissions.length,
    1,
  );
  const [permission] = createdRole.rolePermissions;
  typia.assert(permission);
  TestValidator.equals(
    "permission key matches",
    permission.permission_key,
    "employee:view",
  );
  TestValidator.predicate(
    "permission created_at is set",
    permission.created_at !== null && permission.created_at !== "",
  );
  TestValidator.predicate(
    "permission updated_at is set",
    permission.updated_at !== null && permission.updated_at !== "",
  );
  // Validate embedded role summary in permission
  TestValidator.equals(
    "permission role name matches",
    permission.role.name,
    roleName,
  );
  TestValidator.equals(
    "permission role description is null",
    permission.role.description,
    null,
  );
  TestValidator.equals(
    "permission role is not built-in",
    permission.role.builtIn,
    false,
  );
}
