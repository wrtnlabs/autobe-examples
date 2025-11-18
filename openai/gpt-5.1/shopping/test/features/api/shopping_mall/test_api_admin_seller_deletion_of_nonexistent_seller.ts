import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate admin deletion behavior when targeting a non-existent seller.
 *
 * This test ensures that the administrative DELETE
 * /shoppingMall/admin/sellers/{sellerId} endpoint does not silently succeed
 * when the provided sellerId does not match any existing seller in
 * shopping_mall_sellers. Instead, it must fail with an error, allowing clients
 * to distinguish invalid identifiers from successful deletions.
 *
 * Business context:
 *
 * - Admins manage seller accounts and may need to remove sellers.
 * - Deleting an unknown seller must not be treated as a no-op success, because
 *   that would hide client bugs or stale identifiers.
 * - After a failed deletion attempt, other seller-management APIs must remain
 *   functional.
 *
 * Scenario steps:
 *
 * 1. Join an admin using POST /auth/admin/join with
 *    IShoppingMallAdminJoin.ICreate. The SDK automatically wires the resulting
 *    access token into the connection.headers.Authorization header, so
 *    subsequent calls run in an authenticated admin context.
 * 2. Optionally call PATCH /shoppingMall/admin/sellers with a simple
 *    IShoppingMallSeller.IRequest payload (e.g., default pagination) to ensure
 *    the listing endpoint is working and to exercise the search API before the
 *    deletion attempt.
 * 3. Generate a random sellerId string that is intended to represent a
 *    non-existent seller. We do not need to prove its non-existence by search,
 *    because this is a negative-path test; we simply avoid reusing any ID
 *    returned from index().
 * 4. Call DELETE /shoppingMall/admin/sellers/{sellerId} via
 *    api.functional.shoppingMall.admin.sellers.erase with the random sellerId.
 *    Wrap this call in TestValidator.error with an async closure to assert that
 *    the operation fails instead of returning an IShoppingMallSeller. We do not
 *    assert a specific HTTP status code or error payload; we only require that
 *    an error is thrown for the invalid identifier.
 * 5. After the failed deletion attempt, call PATCH /shoppingMall/admin/sellers
 *    again with another IShoppingMallSeller.IRequest payload and verify via
 *    typia.assert that the IPageIShoppingMallSeller.ISummary response structure
 *    is still valid. This indirectly confirms that the failed deletion did not
 *    corrupt the seller listing behavior or response schema.
 *
 * Validations:
 *
 * - Admin join returns an IShoppingMallAdmin.IAuthorized payload that passes
 *   typia.assert, proving the auth flow is functioning.
 * - DELETE /shoppingMall/admin/sellers/{sellerId} with a synthetic, presumed
 *   non-existent ID throws an error rather than silently succeeding.
 * - The seller search endpoint continues to respond with a well-typed
 *   IPageIShoppingMallSeller.ISummary after the failed deletion attempt.
 */
export async function test_api_admin_seller_deletion_of_nonexistent_seller(
  connection: api.IConnection,
) {
  // 1. Establish admin context via join
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Optional pre-check: list sellers to exercise the search endpoint
  const preSearchRequest = typia.random<IShoppingMallSeller.IRequest>();
  const preSearchPage: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.admin.sellers.index(connection, {
      body: preSearchRequest,
    });
  typia.assert<IPageIShoppingMallSeller.ISummary>(preSearchPage);

  // 3. Generate a synthetic sellerId that should not correspond to any
  //    existing seller. We use a UUID-format string, but the erase props type
  //    only requires string, so typia.random<string>() is acceptable here.
  const nonexistentSellerId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Attempt deletion of the non-existent seller and assert that it fails.
  await TestValidator.error(
    "deleting non-existent seller must fail",
    async () => {
      await api.functional.shoppingMall.admin.sellers.erase(connection, {
        sellerId: nonexistentSellerId,
      });
    },
  );

  // 5. Post-check: ensure seller listing still works and returns a
  //    well-typed pagination structure after the failed deletion attempt.
  const postSearchRequest = typia.random<IShoppingMallSeller.IRequest>();
  const postSearchPage: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.admin.sellers.index(connection, {
      body: postSearchRequest,
    });
  typia.assert<IPageIShoppingMallSeller.ISummary>(postSearchPage);
}
