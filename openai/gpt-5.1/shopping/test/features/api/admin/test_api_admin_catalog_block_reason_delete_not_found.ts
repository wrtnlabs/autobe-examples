import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Validate that deleting a non-existent catalog block reason as an admin
 * results in an HTTP error instead of succeeding silently.
 *
 * Business context:
 *
 * - Catalog block reasons are admin-managed reference data. Deleting by a missing
 *   ID must not behave like a no-op; it should produce an error so callers know
 *   the target did not exist.
 * - Admin authentication is required even when the target id does not exist.
 *
 * Steps:
 *
 * 1. Register an admin via POST /auth/admin/join to establish an authenticated
 *    admin context.
 * 2. Generate a UUID-like catalogBlockReasonId that is extremely unlikely to match
 *    any existing record.
 * 3. Call DELETE /shoppingMall/admin/catalogBlockReasons/{catalogBlockReasonId}
 *    through the SDK.
 * 4. Assert that the call fails by throwing an HTTP error, proving that the
 *    endpoint does not silently succeed when nothing is deleted.
 */
export async function test_api_admin_catalog_block_reason_delete_not_found(
  connection: api.IConnection,
) {
  // 1. Register an admin and establish authenticated context
  const admin = await api.functional.auth.admin.join(connection, {
    body: typia.random<IShoppingMallAdminJoin.ICreate>(),
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Generate a UUID-like non-existent catalogBlockReasonId
  const nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3–4. Attempt deletion and assert that it results in an error
  await TestValidator.error(
    "deleting non-existent catalog block reason should fail",
    async () => {
      await api.functional.shoppingMall.admin.catalogBlockReasons.erase(
        connection,
        {
          catalogBlockReasonId: nonExistentId,
        },
      );
    },
  );
}
