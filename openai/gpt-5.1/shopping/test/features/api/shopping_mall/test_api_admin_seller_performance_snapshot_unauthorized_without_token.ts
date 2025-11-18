import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPerformanceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPerformanceSnapshot";

/**
 * Ensure admin seller performance snapshots endpoint rejects unauthenticated
 * access.
 *
 * Business context:
 *
 * - `GET /shoppingMall/admin/sellerPerformanceSnapshots/{snapshotId}` is an
 *   admin-only analytics endpoint exposing sensitive seller KPI data.
 * - Requests must be authenticated as an admin; unauthenticated callers must not
 *   learn anything about seller performance or even whether a particular
 *   snapshot ID exists.
 *
 * Test objectives:
 *
 * 1. Call the detail endpoint without any Authorization header.
 * 2. Verify that the backend responds with an HTTP authentication error (401/403).
 * 3. Confirm that the call does not succeed and thus no KPI snapshot payload is
 *    returned.
 *
 * Steps:
 *
 * 1. Generate a random UUID to use as `snapshotId`.
 * 2. Derive an unauthenticated connection from the provided authenticated/normal
 *    `connection` by cloning it and overriding `headers` to an empty object,
 *    without mutating the original connection.
 * 3. Use `TestValidator.httpError` with status `[401, 403]` to assert that calling
 *    `api.functional.shoppingMall.admin.sellerPerformanceSnapshots.at` with the
 *    unauthenticated connection fails with an authentication-related HTTP
 *    error.
 * 4. Do not inspect the response body; the fact that the call results in an HTTP
 *    error is sufficient to prove that no snapshot data is exposed to an
 *    unauthenticated client.
 */
export async function test_api_admin_seller_performance_snapshot_unauthorized_without_token(
  connection: api.IConnection,
) {
  // 1. Prepare a syntactically valid UUID for snapshotId.
  const snapshotId = typia.random<string & tags.Format<"uuid">>();

  // 2. Derive an unauthenticated connection without mutating the original.
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 3. Call the admin-only endpoint without Authorization header
  //    and assert that an authentication-related HTTP error is thrown.
  await TestValidator.httpError(
    "admin seller performance snapshot requires authentication",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.admin.sellerPerformanceSnapshots.at(
        unauthConn,
        { snapshotId },
      );
    },
  );
}
