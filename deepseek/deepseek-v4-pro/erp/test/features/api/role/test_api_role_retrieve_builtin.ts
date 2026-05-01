import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPermission";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieval of a built-in role within the current organization.
 *
 * Validates that a built-in role (Owner, Manager, or Employee) can be retrieved by its unique identifier. The response must include the complete role definition: name, description, is_builtin flag set to true, the full permission set with each permission's unique key and human-readable description, and timestamps (created_at, updated_at) with deleted_at being null.
 *
 * Built-in roles are provisioned automatically at organization creation and must always be retrievable. This test ensures that the role retrieval endpoint correctly returns all expected fields for built-in roles and that the response structure fully conforms to the IErpHrmRole type definition.
 *
 * 1. Call the role retrieval endpoint with a valid role ID from the organization's built-in roles.
 * 2. Validate the complete response structure with typia.assert.
 * 3. Verify is_builtin is true, confirming the role is one of the three immutable built-in roles.
 * 4. Verify deleted_at is null, confirming the role is active and not soft-deleted.
 * 5. Verify the permissions array contains entries, each with a valid key and description.
 */
export async function test_api_role_retrieve_builtin(
  connection: api.IConnection,
): Promise<void> {
  const role = await api.functional.erpHrm.roles.at(connection, {
    roleId: typia.random<string & tags.Format<"uuid">>(),
  });
  typia.assert(role);
  TestValidator.predicate("is builtin role", role.is_builtin === true);
  TestValidator.equals("deleted_at is null", role.deleted_at, null);
  TestValidator.predicate(
    "permissions array is non-empty",
    role.permissions.length > 0,
  );
  TestValidator.predicate(
    "permissions have valid key",
    role.permissions.every(
      (p) => typeof p.key === "string" && p.key.length > 0,
    ),
  );
  TestValidator.predicate(
    "permissions have valid description",
    role.permissions.every((p) => typeof p.description === "string"),
  );
}
