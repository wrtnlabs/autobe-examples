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
 * Verify not-found behavior when an admin queries a non-existent seller
 * performance snapshot.
 *
 * Business purpose:
 *
 * - Ensure that the admin-only detail endpoint for seller performance snapshots
 *   properly rejects requests for IDs that are syntactically valid (UUID) but
 *   do not correspond to any existing snapshot row.
 * - Confirm that the platform surfaces this condition as an HTTP 404 not-found
 *   error instead of returning a random snapshot or a generic 500.
 *
 * Scenario:
 *
 * 1. Register an admin account using POST /auth/admin/join.
 *
 *    - This both creates the admin and issues an access token, which the SDK
 *         automatically attaches to subsequent requests via connection
 *         headers.
 * 2. Generate a random UUID string to act as the snapshotId. Because it is random
 *    and not created in this test, it is effectively guaranteed to have no
 *    corresponding snapshot record.
 * 3. Call GET /shoppingMall/admin/sellerPerformanceSnapshots/{snapshotId} through
 *    api.functional.shoppingMall.admin.sellerPerformanceSnapshots.at.
 * 4. Assert that the call results in an HttpError with 404 status using
 *    TestValidator.httpError, which is the standard way in this test harness to
 *    validate HTTP error status codes.
 */
export async function test_api_admin_seller_performance_snapshot_not_found(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain an authenticated admin context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  // Validate the authorized admin payload shape
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Generate a syntactically valid but non-existent snapshotId (random UUID)
  const nonExistingSnapshotId = typia.random<string & tags.Format<"uuid">>();

  // 3-4. Call detail endpoint and assert 404 not-found via HttpError
  await TestValidator.httpError(
    "admin requesting non-existent seller performance snapshot should get 404",
    404,
    async () => {
      await api.functional.shoppingMall.admin.sellerPerformanceSnapshots.at(
        connection,
        {
          snapshotId: nonExistingSnapshotId,
        },
      );
    },
  );
}
