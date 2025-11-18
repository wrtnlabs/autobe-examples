import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCatalogSearchIndexEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogSearchIndexEntry";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Verify that requesting a non-existent catalog search index entry as an
 * authenticated admin fails with an error rather than returning a
 * IShoppingMallCatalogSearchIndexEntry payload.
 *
 * Business goal:
 *
 * - Ensure the catalogSearch.indexEntries.at endpoint does not silently fabricate
 *   or expose index entries for arbitrary UUIDs.
 * - Distinguish the "resource does not exist" behavior from auth-related failures
 *   by first establishing a valid admin session.
 *
 * Steps:
 *
 * 1. Register a new admin via POST /auth/admin/join using a valid
 *    IShoppingMallAdminJoin.ICreate request body.
 *
 *    - Use typia.random<IShoppingMallAdminJoin.ICreate>() to satisfy all documented
 *         constraints (email/password formats, href/referrer URIs, optional ip,
 *         etc.).
 *    - Typia.assert the IShoppingMallAdmin.IAuthorized response to validate the
 *         shape and implicitly confirm that the SDK has attached an
 *         Authorization header to the shared connection.
 * 2. Generate a UUID value that is extremely unlikely to correspond to an actual
 *    catalog search index entry.
 *
 *    - Use typia.random<string & tags.Format<"uuid">>() to obtain a syntactically
 *         valid UUID string that satisfies the path-parameter type of
 *         catalogSearchIndexEntryId.
 * 3. Attempt to fetch the catalog search index entry using
 *    api.functional.shoppingMall.admin.catalogSearch.indexEntries.at, passing
 *    the random UUID as catalogSearchIndexEntryId.
 *
 *    - Wrap this call in TestValidator.error with an async callback, because the
 *         expectation for a non-existent ID is that the SDK will surface an
 *         error (likely an HttpError from the server) rather than returning a
 *         successful IShoppingMallCatalogSearchIndexEntry object.
 *    - Do NOT inspect HttpError.status or error body; global guidelines prohibit
 *         validating explicit HTTP status codes or error-envelope structure.
 *         The assertion is purely that an error occurs.
 * 4. Rely on TestValidator.error semantics to guarantee that no
 *    IShoppingMallCatalogSearchIndexEntry instance is produced.
 *
 *    - If the call unexpectedly succeeds and returns a value, the
 *         TestValidator.error assertion will fail the test, which implicitly
 *         ensures that the success-path DTO is never observed when the resource
 *         does not exist.
 */
export async function test_api_admin_catalog_index_entry_not_found(
  connection: api.IConnection,
) {
  // 1. Join as an admin to ensure authentication is not the failure cause.
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: typia.random<IShoppingMallAdminJoin.ICreate>(),
    });
  typia.assert(admin);

  // 2. Generate a random UUID that is vanishingly unlikely to exist as an
  // index entry primary key.
  const missingId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Attempt to fetch the non-existent catalog search index entry and
  // assert that the call fails with an error.
  await TestValidator.error(
    "non-existent catalog index entry must error",
    async () => {
      await api.functional.shoppingMall.admin.catalogSearch.indexEntries.at(
        connection,
        { catalogSearchIndexEntryId: missingId },
      );
    },
  );
}
