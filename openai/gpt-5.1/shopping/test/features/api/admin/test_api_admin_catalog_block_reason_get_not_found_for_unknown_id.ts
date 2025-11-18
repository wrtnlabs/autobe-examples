import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCatalogBlockReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogBlockReason";

/**
 * Validate not-found behavior when requesting a catalog block reason with an
 * unknown UUID.
 *
 * Business goal: Ensure that the admin-facing GET
 * /shoppingMall/admin/catalogBlockReasons/{catalogBlockReasonId} endpoint does
 * not accidentally succeed or leak internal details when given a UUID that does
 * not correspond to any shopping_mall_catalog_block_reasons record, while the
 * caller is a properly authenticated admin. This protects admin UX around
 * outdated bookmarks and reinforces clear, robust error handling for missing
 * reference data.
 *
 * Test workflow:
 *
 * 1. Perform an admin join via POST /auth/admin/join to obtain a valid
 *    administrator session and token. This guarantees that any subsequent
 *    failure of the GET operation is due to the resource identifier, not
 *    authentication.
 * 2. Generate a UUID value that is extremely unlikely to exist in the catalog
 *    block reasons table. For example, use typia.random<string &
 *    tags.Format<"uuid">>() as a random unknown id, independent from any values
 *    returned by the system.
 * 3. Invoke api.functional.shoppingMall.admin.catalogBlockReasons.at with the
 *    generated UUID as catalogBlockReasonId using the authenticated
 *    connection.
 * 4. Wrap the invocation in TestValidator.error to assert that an error is thrown
 *    for this unknown id. We intentionally do not assert an HTTP status code or
 *    error payload shape, only that the request fails rather than returning a
 *    success payload.
 * 5. Because typia.assert() already guarantees schema-level validation on success
 *    paths, and this test focuses solely on the negative not-found path, we
 *    never call typia.assert() on the at() result here; the expectation is that
 *    the call never returns successfully.
 */
export async function test_api_admin_catalog_block_reason_get_not_found_for_unknown_id(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain a valid admin session/token.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Generate a UUID that is extremely unlikely to correspond to any existing
  //    catalog block reason record.
  const unknownId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3–4. Call the catalogBlockReasons.at endpoint with the unknown id and assert
  //      that the call fails for this non-existent resource.
  await TestValidator.error(
    "GET catalogBlockReasons.at must fail for unknown catalogBlockReasonId",
    async () => {
      await api.functional.shoppingMall.admin.catalogBlockReasons.at(
        connection,
        { catalogBlockReasonId: unknownId },
      );
    },
  );
}
