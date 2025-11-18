import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCatalogBlockReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogBlockReason";

/**
 * Validate that updating a non-existent catalog block reason as an admin fails.
 *
 * Business context:
 *
 * - Catalog block reasons are reference data records that explain why catalog
 *   entities (products, SKUs, etc.) are blocked or hidden.
 * - Admin tools must be resilient to stale or invalid identifiers. When a UI
 *   attempts to update a block reason that no longer exists (or never existed),
 *   the backend must not silently create new records or return success.
 *
 * What this test verifies (within framework constraints):
 *
 * 1. An admin can be created and authenticated via POST /auth/admin/join, and the
 *    SDK attaches the Authorization header to the connection.
 * 2. When the admin calls PUT
 *    /shoppingMall/admin/catalogBlockReasons/{catalogBlockReasonId} with a
 *    random UUID as catalogBlockReasonId and a semantically valid
 *    IShoppingMallCatalogBlockReason.IUpdate payload, the call fails.
 *
 * Notes on limitations:
 *
 * - We do NOT assert specific HTTP status codes or error payload structures,
 *   because the E2E framework discourages status-code-specific checks and
 *   error-shape inspections.
 * - Instead, we assert only that an error is thrown for such an update attempt,
 *   using TestValidator.error.
 */
export async function test_api_admin_catalog_block_reason_update_not_found(
  connection: api.IConnection,
) {
  // 1. Join as an admin to obtain an authenticated admin context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Prepare a random UUID that is overwhelmingly likely to be non-existent.
  const nonExistentCatalogBlockReasonId: string & tags.Format<"uuid"> =
    typia.random<string & tags.Format<"uuid">>();

  // 3. Construct a valid update payload for the catalog block reason.
  const severityLevels = ["low", "medium", "high"] as const;
  const updateBody = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.paragraph({ sentences: 3 }),
    severity_level: RandomGenerator.pick(severityLevels),
  } satisfies IShoppingMallCatalogBlockReason.IUpdate;

  // 4. Assert that attempting to update this non-existent ID results in an error.
  await TestValidator.error(
    "updating non-existent catalog block reason should fail",
    async () => {
      await api.functional.shoppingMall.admin.catalogBlockReasons.update(
        connection,
        {
          catalogBlockReasonId: nonExistentCatalogBlockReasonId,
          body: updateBody,
        },
      );
    },
  );
}
