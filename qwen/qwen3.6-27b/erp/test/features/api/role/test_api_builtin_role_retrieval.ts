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

/**
 * Test retrieval of a built-in platform role (Owner, Manager, or Employee).
 *
 * Validates that a built-in role can be retrieved by its unique identifier and that the response conforms to the IHrmPlatformRole schema. Built-in roles are auto-provisioned during organization creation with predefined immutable permissions.
 *
 * The test authenticates a new member, which triggers creation of a default organization and its associated built-in roles. It then retrieves one of these auto-provisioned roles and verifies structural correctness.
 *
 * 1. Create and authenticate a new member account (auto-creates default organization with built-in roles).
 * 2. Generate a UUID to represent a built-in role identifier.
 * 3. Retrieve the role detail via GET /hrmPlatform/member/roles/{roleId}.
 * 4. Assert response matches IHrmPlatformRole schema via typia.assert.
 * 5. Validate built_in flag is true for auto-provisioned roles.
 * 6. Validate role name is one of the predefined built-in role names.
 * 7. Validate rolePermissions array contains permission entries with valid keys.
 * 8. Validate deleted_at is null (built-in roles cannot be deleted).
 */
export async function test_api_builtin_role_retrieval(
  connection: api.IConnection,
) {
  // 1. Authenticate member (auto-creates organization with built-in roles)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Generate a UUID for the built-in role identifier
  const roleId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the built-in role
  const role = await api.functional.hrmPlatform.member.roles.at(
    memberConnection,
    {
      roleId,
    },
  );
  // 4. Assert response matches IHrmPlatformRole schema (validates all types, formats, structures)
  typia.assert(role);
  // 5. Validate built_in flag is true for auto-provisioned platform roles
  TestValidator.equals("built_in is true", role.built_in, true);
  // 6. Validate role name is one of the predefined built-in role names
  const BUILTIN_ROLE_NAMES = ["Owner", "Manager", "Employee"] as const;
  TestValidator.predicate(
    "name is a built-in role name",
    (BUILTIN_ROLE_NAMES as readonly string[]).includes(role.name),
  );
  // 7. Validate rolePermissions contains permission entries with valid keys
  TestValidator.predicate(
    "rolePermissions has entries",
    role.rolePermissions.length > 0,
  );
  for (const perm of role.rolePermissions) {
    typia.assert(perm);
  }
  // 8. Validate deleted_at is null (built-in roles cannot be deleted)
  TestValidator.equals("deleted_at is null", role.deleted_at, null);
}
