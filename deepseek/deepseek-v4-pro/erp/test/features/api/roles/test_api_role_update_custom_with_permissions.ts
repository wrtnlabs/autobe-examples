import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPermission";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_erp_hrm_roles_create } from "../../../generate/generate_random_erp_hrm_roles_create";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

/**
 * Test updating a custom role's name, description, and permission set in a single atomic operation.
 *
 * Validates that custom roles can be fully reconfigured through the update endpoint: changing the display name to a new unique value, updating the description, and replacing the entire permission set atomically. The test confirms that permissions are replaced rather than merged by verifying the response contains exactly the replacement set, and that the updated_at timestamp advances after modification.
 *
 * 1. Create a custom role via generate_random_erp_hrm_roles_create with an initial name, description, and permission set.
 * 2. Update the role: set a new unique name, new description, and a reduced subset of the original permissions.
 * 3. Verify the response reflects all changes — name updated, description updated, permissions replaced (not merged).
 * 4. Confirm the updated_at timestamp has advanced past the original value.
 */
export async function test_api_role_update_custom_with_permissions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a custom role with initial configuration
  const role = await generate_random_erp_hrm_roles_create(connection, {});
  typia.assert(role);
  const originalUpdatedAt = role.updated_at;
  const originalPermissionIds = role.permissions.map((p) => p.id);
  // 2. Prepare update body: new name, new description, reduced permission subset
  const newName = RandomGenerator.name();
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  // Use a proper subset: if role has multiple permissions, reduce to a single one
  const newPermissionIds =
    originalPermissionIds.length > 1
      ? [originalPermissionIds[0]]
      : originalPermissionIds;
  // 3. Update the role
  const updatedRole = await api.functional.erpHrm.roles.update(connection, {
    roleId: role.id,
    body: {
      name: newName,
      description: newDescription,
      permission_ids: newPermissionIds,
    } satisfies IErpHrmRole.IUpdate,
  });
  typia.assert(updatedRole);
  // 4. Validate the update
  TestValidator.equals("role id unchanged", updatedRole.id, role.id);
  TestValidator.equals("name updated", updatedRole.name, newName);
  TestValidator.equals(
    "description updated",
    updatedRole.description,
    newDescription,
  );
  TestValidator.equals(
    "permissions count matches replacement set",
    updatedRole.permissions.length,
    newPermissionIds.length,
  );
  for (const perm of updatedRole.permissions) {
    TestValidator.predicate(
      "permission id belongs to replacement set",
      newPermissionIds.includes(perm.id),
    );
  }
  TestValidator.predicate(
    "updated_at timestamp advanced",
    updatedRole.updated_at > originalUpdatedAt,
  );
}
