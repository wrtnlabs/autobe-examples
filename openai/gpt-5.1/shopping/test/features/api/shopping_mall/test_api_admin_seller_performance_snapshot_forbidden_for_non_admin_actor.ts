import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerPerformanceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPerformanceSnapshot";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Verify that a seller-authenticated actor cannot access the admin-only seller
 * performance snapshot detail endpoint.
 *
 * Business context:
 *
 * - Admin analytics endpoints under /shoppingMall/admin are restricted to
 *   administrator actors only.
 * - Sellers authenticate via POST /auth/seller/join and receive JWT tokens in
 *   IAuthorizationToken, which the SDK automatically attaches to
 *   connection.headers.Authorization for subsequent calls.
 * - The seller performance snapshot detail endpoint GET
 *   /shoppingMall/admin/sellerPerformanceSnapshots/{snapshotId} is intended for
 *   admin back-office and risk/governance tooling, not for sellers themselves.
 *
 * Test steps:
 *
 * 1. Register and authenticate a seller using api.functional.auth.seller.join with
 *    a valid IShoppingMallSellerAuthJoin.IRequest payload.
 * 2. Confirm that the seller join call returns a valid
 *    IShoppingMallSeller.IAuthorized object via typia.assert.
 * 3. Generate a syntactically valid snapshotId using typia.random<string &
 *    tags.Format<"uuid">>(). This ensures we satisfy the path parameter type
 *    contract without assuming existence of any particular snapshot row.
 * 4. Depending on whether the SDK connection is running in simulate mode: 4-1. If
 *    connection.simulate === true (mock environment): - Call
 *    api.functional.shoppingMall.admin.sellerPerformanceSnapshots.at directly
 *    with the seller-authenticated connection and the random snapshotId. -
 *    Assert the returned value as IShoppingMallSellerPerformanceSnapshot using
 *    typia.assert to validate response typing. - This path does not exercise
 *    authorization logic but ensures the endpoint can be invoked with correct
 *    types even from a seller context when simulation is enabled. 4-2. If
 *    connection.simulate !== true (real backend): - Use await
 *    TestValidator.error( "non-admin seller cannot access admin seller
 *    performance snapshot", async () => { await
 *    api.functional.shoppingMall.admin.sellerPerformanceSnapshots.at(
 *    connection, { snapshotId }, ); }, ); - This asserts that attempting to
 *    call the admin-only endpoint with a seller token results in some runtime
 *    error (typically an authorization failure such as 403), without asserting
 *    on specific HTTP status codes or error payloads.
 *
 * Notes and constraints:
 *
 * - The test must not inspect HttpError.status or error.message, nor assert
 *   specific HTTP codes. It only checks that an error occurs for the non-admin
 *   actor.
 * - The test must not send type-invalid data or omit required fields; all request
 *   DTOs must satisfy their respective types.
 * - The test must not touch connection.headers directly; token management is
 *   delegated to the SDK authentication functions.
 */
export async function test_api_admin_seller_performance_snapshot_forbidden_for_non_admin_actor(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a seller via POST /auth/seller/join
  const sellerJoinRequest =
    typia.random<IShoppingMallSellerAuthJoin.IRequest>();

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinRequest,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Prepare a syntactically valid snapshotId
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Branch based on simulate mode
  if (connection.simulate === true) {
    // In simulate mode, the at() call returns mock data without enforcing
    // authorization, so we just validate the type of the response.
    const snapshot: IShoppingMallSellerPerformanceSnapshot =
      await api.functional.shoppingMall.admin.sellerPerformanceSnapshots.at(
        connection,
        { snapshotId },
      );
    typia.assert<IShoppingMallSellerPerformanceSnapshot>(snapshot);
  } else {
    // In real backend mode, the call should fail for a seller actor because
    // the endpoint is admin-only. We assert that some error is thrown,
    // without checking specific HTTP status codes.
    await TestValidator.error(
      "non-admin seller cannot access admin seller performance snapshot",
      async () => {
        await api.functional.shoppingMall.admin.sellerPerformanceSnapshots.at(
          connection,
          { snapshotId },
        );
      },
    );
  }
}
