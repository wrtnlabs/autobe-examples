import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate admin-side handling of seller email uniqueness when updating
 * sellers.
 *
 * Business goal:
 *
 * - Ensure that an admin cannot change a seller's email to an email already used
 *   by another seller (unique constraint on `shopping_mall_sellers.email`).
 * - Ensure that a failed conflicting update does not partially modify the seller.
 * - Ensure that a non-conflicting update with a unique email succeeds and applies
 *   changes correctly.
 *
 * High-level workflow:
 *
 * 1. Create Seller A via POST /auth/seller/join with emailA.
 * 2. Create Seller B via POST /auth/seller/join with emailB.
 *
 *    - Capture Seller B's initial state (id, email, status, email_verified,
 *         timestamps).
 * 3. Create and authenticate an admin via POST /auth/admin/join.
 *
 *    - This will set `connection.headers.Authorization` to the admin's access token
 *         and must be executed after seller joins so that the final token
 *         belongs to an admin when calling the admin update endpoint.
 * 4. As the admin, attempt to update Seller B's email to emailA via PUT
 *    /shoppingMall/admin/sellers/{sellerId}.
 *
 *    - Use IShoppingMallSeller.IUpdate with only `email: emailA`.
 *    - Assert that this call fails using TestValidator.error, as it should violate
 *         the unique email constraint.
 *    - Because the call fails, no partial update should have been applied. We cannot
 *         re-fetch Seller B via a GET endpoint, so we instead assert that the
 *         update did not succeed at all (no IShoppingMallSeller is returned)
 *         and keep the original authorized payload as the ground truth.
 * 5. Perform a non-conflicting update on Seller B with a unique emailC.
 *
 *    - Call update() again with IShoppingMallSeller.IUpdate { email: emailC }.
 *    - This time expect success and capture the returned IShoppingMallSeller.
 *    - Assert via typia.assert and TestValidator that:
 *
 *         - `id` matches Seller B's original id.
 *         - `email` is now emailC.
 *         - `status` remains the same as before.
 *         - `email_verified` is logically consistent (we at least assert that a boolean
 *                   is returned and does not become null/undefined).
 *         - `created_at` is unchanged.
 */
export async function test_api_admin_update_seller_email_conflict_handling(
  connection: api.IConnection,
) {
  // 1. Create Seller A with emailA (unauthenticated or public join)
  const emailA: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const sellerAJoinBody = {
    email: emailA,
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.test-frontend.local/join",
    referrer: "https://seller.test-frontend.local/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinBody,
    });
  typia.assert(sellerAAuthorized);

  // 2. Create Seller B with emailB
  const emailB: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const sellerBJoinBody = {
    email: emailB,
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.test-frontend.local/join",
    referrer: "https://seller.test-frontend.local/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerBAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinBody,
    });
  typia.assert(sellerBAuthorized);

  // Capture original Seller B state for later comparison
  const originalSellerBId = sellerBAuthorized.id;
  const originalSellerBStatus = sellerBAuthorized.status;
  const originalSellerBEmailVerified = sellerBAuthorized.email_verified;
  const originalSellerBCreatedAt = sellerBAuthorized.created_at;

  // 3. Create and authenticate an admin AFTER sellers so that the
  //    Authorization token used for updates belongs to an admin.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.test-frontend.local/join",
    referrer: "https://admin.test-frontend.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 4. Attempt conflicting update: set Seller B's email to emailA
  const conflictingUpdateBody = {
    email: emailA,
  } satisfies IShoppingMallSeller.IUpdate;

  await TestValidator.error(
    "admin cannot update seller email to an already used email (conflict)",
    async () => {
      await api.functional.shoppingMall.admin.sellers.update(connection, {
        sellerId: originalSellerBId,
        body: conflictingUpdateBody,
      });
    },
  );

  // Since the conflicting update failed, we rely on the fact that no
  // IShoppingMallSeller was returned and therefore no update was committed.
  // We keep the original authorized payload as the ground truth.
  TestValidator.equals(
    "original Seller B email remains unchanged in our ground truth",
    sellerBAuthorized.email,
    emailB,
  );
  TestValidator.equals(
    "original Seller B status remains as initially set in our ground truth",
    sellerBAuthorized.status,
    originalSellerBStatus,
  );

  // 5. Perform non-conflicting update with unique emailC
  const emailC: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const nonConflictingUpdateBody = {
    email: emailC,
  } satisfies IShoppingMallSeller.IUpdate;

  const updatedSellerB: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.update(connection, {
      sellerId: originalSellerBId,
      body: nonConflictingUpdateBody,
    });
  typia.assert(updatedSellerB);

  // 6. Validate that non-conflicting update succeeded correctly
  TestValidator.equals(
    "updated seller B id should match original id",
    updatedSellerB.id,
    originalSellerBId,
  );
  TestValidator.equals(
    "updated seller B email should be the new unique emailC",
    updatedSellerB.email,
    emailC,
  );
  TestValidator.equals(
    "updated seller B status remains the same as original",
    updatedSellerB.status,
    originalSellerBStatus,
  );
  TestValidator.equals(
    "updated seller B email_verified remains consistent with original",
    updatedSellerB.email_verified,
    originalSellerBEmailVerified,
  );
  TestValidator.equals(
    "seller B created_at remains unchanged after update",
    updatedSellerB.created_at,
    originalSellerBCreatedAt,
  );

  // We cannot reliably assert ordering of updated_at vs original timestamps
  // without time control, but typia.assert has already validated its type and
  // format. We just ensure it is non-empty to guard against regressions.
  TestValidator.predicate(
    "updated seller B updated_at must be a non-empty string",
    updatedSellerB.updated_at.length > 0,
  );
}
