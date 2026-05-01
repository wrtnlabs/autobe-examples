import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that retrieving a non-existent permission returns HTTP 404 Not Found.
 *
 * Validates that the GET /erpHrm/permissions/{permissionId} endpoint correctly
 * returns a 404 error when queried with a syntactically valid UUID that does not
 * correspond to any permission in the system's fixed catalog of nine permissions.
 *
 * Permissions are globally accessible to any authenticated member, so this test
 * verifies that the 404 is a business-level resource-not-found error rather than
 * an authentication or authorization error.
 *
 * 1. Generate a random UUID v4 that does not match any seeded permission.
 * 2. Attempt to retrieve the non-existent permission.
 * 3. Verify the API returns HTTP 404 Not Found.
 */
export async function test_api_permission_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent permission returns 404",
    404,
    async () =>
      await api.functional.erpHrm.permissions.at(connection, {
        permissionId: nonExistentId,
      }),
  );
}
