import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCatalogBlockReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCatalogBlockReason";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCatalogBlockReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCatalogBlockReason";

/**
 * Verify that catalog block reasons search is restricted to authenticated
 * admins and becomes available after admin join.
 *
 * Business goal:
 *
 * - Ensure that PATCH /shoppingMall/admin/catalogBlockReasons cannot be called
 *   without an admin token (authorization enforced at gateway/service level).
 * - Ensure that once an admin has joined and is authenticated, the same endpoint
 *   responds successfully with a properly typed page of block reasons.
 *
 * Steps:
 *
 * 1. Using the initial connection before any auth calls, attempt
 *    api.functional.shoppingMall.admin.catalogBlockReasons.index and assert
 *    that a 4xx HttpError is raised with TestValidator.httpError (we do not
 *    depend on a specific status code like 401 vs 403).
 * 2. Prepare a minimal IShoppingMallCatalogBlockReason.IRequest body focusing on
 *    pagination only (page/limit), leaving other filters undefined.
 * 3. Call api.functional.auth.admin.join with a random
 *    IShoppingMallAdminJoin.ICreate DTO to register an admin. This will also
 *    set connection.headers.Authorization with the returned access token.
 * 4. With the authenticated connection, call the same catalogBlockReasons.index
 *    endpoint using the same minimal request body.
 * 5. Assert via typia.assert that the response conforms to
 *    IPageIShoppingMallCatalogBlockReason.ISummary, then add light business
 *    validations on pagination numbers (current, limit, pages, records are
 *
 * > = 0).
 */
export async function test_api_admin_catalog_block_reasons_unauthorized_access_blocked(
  connection: api.IConnection,
) {
  // 1. Prepare a minimal catalog block reason search request body.
  const requestBody = {
    page: 0,
    limit: 5,
  } satisfies IShoppingMallCatalogBlockReason.IRequest;

  // 2. Ensure unauthorized clients cannot access the admin catalog block reasons endpoint.
  // Use the initial connection before any admin join; at this point there is
  // no admin Authorization token attached.
  await TestValidator.httpError(
    "unauthenticated access to catalogBlockReasons must be rejected",
    [400, 401, 403, 404, 422],
    async () => {
      await api.functional.shoppingMall.admin.catalogBlockReasons.index(
        connection,
        {
          body: requestBody,
        },
      );
    },
  );

  // 3. Register an admin (join) to obtain an authenticated admin context.
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 4. Call the catalog block reasons search endpoint again with authentication.
  const pageResult: IPageIShoppingMallCatalogBlockReason.ISummary =
    await api.functional.shoppingMall.admin.catalogBlockReasons.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert<IPageIShoppingMallCatalogBlockReason.ISummary>(pageResult);

  // 5. Validate pagination semantics.
  const pagination = pageResult.pagination;
  TestValidator.predicate(
    "pagination.current should be non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit should be non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records should be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages should be non-negative",
    pagination.pages >= 0,
  );
}
