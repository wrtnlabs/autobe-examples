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
 * Test retrieval of a custom role by ID with full permission details.
 *
 * Validates that the GET /erpHrm/roles/{roleId} endpoint returns a custom role
 * with complete structural integrity and correct business rule conformance.
 *
 * 1. Calls the role retrieval endpoint with a randomly generated UUID as the
 *    role identifier, exercising the path parameter validation and database
 *    lookup within the current organization context.
 * 2. Validates the response structure using typia.assert to confirm all
 *    IErpHrmRole fields are present and correctly typed, including the nested
 *    IErpHrmPermission.ISummary array within the permissions property.
 * 3. Verifies business rules specific to custom roles: is_builtin must be
 *    false (distinguishing custom roles from the three immutable built-in
 *    roles), deleted_at must be null (confirming the role is active and not
 *    soft-deleted), and the permissions array must contain at least one entry
 *    reflecting the permission set assigned during creation.
 */
export async function test_api_role_retrieve_custom_with_permissions(
  connection: api.IConnection,
): Promise<void> {
  const role = await api.functional.erpHrm.roles.at(connection, {
    roleId: typia.random<string & tags.Format<"uuid">>(),
  });
  typia.assert(role);
  TestValidator.equals(
    "is_builtin is false for custom role",
    role.is_builtin,
    false,
  );
  TestValidator.equals(
    "deleted_at is null for active role",
    role.deleted_at,
    null,
  );
  TestValidator.predicate(
    "permissions array is non-empty",
    role.permissions.length > 0,
  );
}
