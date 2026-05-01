import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving an existing permission from the fixed catalog by UUID.
 *
 * Validates the GET /erpHrm/permissions/{permissionId} endpoint returns the full
 * permission record with all required fields. Confirms that the returned key is
 * one of the nine predefined permission identifiers and that the response id
 * matches the requested permissionId.
 *
 * Permissions are immutable system constants seeded at initialization. Any
 * authenticated member can access this endpoint without organization context.
 *
 * 1. Generate a valid UUID as the permissionId.
 * 2. Retrieve the permission via the at endpoint.
 * 3. Validate the full response structure with typia.assert.
 * 4. Confirm the returned id matches the requested permissionId.
 * 5. Confirm the key is one of the nine predefined permission keys.
 */
export async function test_api_permission_retrieve_existing(
  connection: api.IConnection,
): Promise<void> {
  const permissionId = typia.random<string & tags.Format<"uuid">>();
  const permission: IErpHrmPermission =
    await api.functional.erpHrm.permissions.at(connection, {
      permissionId,
    });
  typia.assert(permission);
  const validKeys: readonly string[] = [
    "org:manage",
    "employee:manage",
    "employee:view",
    "project:manage",
    "project:view",
    "time:manage",
    "time:approve",
    "time:view_all",
    "report:view",
  ];
  TestValidator.equals("id matches request", permission.id, permissionId);
  TestValidator.predicate(
    "key is a predefined permission",
    validKeys.includes(permission.key),
  );
}
