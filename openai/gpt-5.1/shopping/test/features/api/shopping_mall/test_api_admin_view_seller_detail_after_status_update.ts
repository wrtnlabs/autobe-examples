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
 * Validate that admin-driven seller status/email updates are reflected in
 * seller detail views.
 *
 * Business context:
 *
 * - Admins manage seller lifecycle (status, contact email, verification flags)
 *   via the PUT /shoppingMall/admin/sellers/{sellerId} endpoint.
 * - Admin-facing detail view GET /shoppingMall/admin/sellers/{sellerId} must show
 *   a consistent IShoppingMallSeller model with updated fields while preserving
 *   identity and creation timestamps.
 *
 * This E2E test covers the following flow:
 *
 * 1. Register an admin via POST /auth/admin/join to establish an admin session.
 * 2. Register a seller via POST /auth/seller/join (this switches the connection
 *    context to the seller actor).
 * 3. Re-register (join) another admin to restore admin Authorization on the
 *    connection for admin-only operations.
 * 4. As admin, call PUT /shoppingMall/admin/sellers/{sellerId} to update the
 *    seller's email, status, and email_verified flag.
 * 5. Validate the update response IShoppingMallSeller:
 *
 *    - Id is unchanged and matches the original seller id
 *    - Email, status, and email_verified reflect the requested changes
 *    - Updated_at is different from the pre-update value
 *    - Deleted_at remains null (soft delete not applied)
 * 6. As the same admin, call GET /shoppingMall/admin/sellers/{sellerId} to fetch
 *    the seller detail.
 * 7. Assert that the detail response IShoppingMallSeller:
 *
 *    - Matches the update response for all core fields (id, email, status,
 *         email_verified, created_at, updated_at)
 *    - Still has deleted_at as null/undefined
 *
 * Notes:
 *
 * - The scenario description mentions duplicate-email conflict and seller login
 *   behavior based on status. These are not implemented here due to the absence
 *   of an /auth/seller/login endpoint and explicit HttpError-based
 *   expectations. This test focuses on the happy-path consistency between
 *   update and detail endpoints.
 */
export async function test_api_admin_view_seller_detail_after_status_update(
  connection: api.IConnection,
) {
  // 1. Register an initial admin to ensure admin capability exists.
  const firstAdminEmail = typia.random<string & tags.Format<"email">>();
  const firstAdminPassword = typia.random<string & tags.Format<"password">>();

  const firstAdminJoinBody = {
    email: firstAdminEmail,
    password: firstAdminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const firstAdminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: firstAdminJoinBody,
    });
  typia.assert(firstAdminAuthorized);

  // 2. Register a seller account; this will switch Authorization to seller.
  const sellerEmailOriginal = typia.random<string & tags.Format<"email">>();
  const sellerPasswordOriginal = typia.random<
    string & tags.Format<"password">
  >();

  const sellerJoinBody = {
    email: sellerEmailOriginal,
    password: sellerPasswordOriginal,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerId: string & tags.Format<"uuid"> = sellerAuthorized.id;
  const sellerCreatedAtBeforeUpdate = sellerAuthorized.created_at;
  const sellerUpdatedAtBeforeUpdate = sellerAuthorized.updated_at;
  const sellerEmailVerifiedBeforeUpdate = sellerAuthorized.email_verified;

  // 3. Join a second admin to restore admin Authorization on the connection.
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 4. As admin, update the seller's email, status, and email_verified.
  const updatedSellerEmail = typia.random<string & tags.Format<"email">>();
  const updatedStatus = "suspended";
  const toggledEmailVerified = !sellerEmailVerifiedBeforeUpdate;

  const updateBody = {
    email: updatedSellerEmail,
    status: updatedStatus,
    email_verified: toggledEmailVerified,
  } satisfies IShoppingMallSeller.IUpdate;

  const updatedSeller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.update(connection, {
      sellerId,
      body: updateBody,
    });
  typia.assert(updatedSeller);

  // Basic invariants: id and created_at are stable.
  TestValidator.equals(
    "updated seller keeps original id",
    updatedSeller.id,
    sellerId,
  );
  TestValidator.equals(
    "updated seller keeps original created_at",
    updatedSeller.created_at,
    sellerCreatedAtBeforeUpdate,
  );

  // Core updated fields reflect requested changes.
  TestValidator.equals(
    "updated seller email matches requested email",
    updatedSeller.email,
    updatedSellerEmail,
  );
  TestValidator.equals(
    "updated seller status matches requested status",
    updatedSeller.status,
    updatedStatus,
  );
  TestValidator.equals(
    "updated seller email_verified flag matches requested value",
    updatedSeller.email_verified,
    toggledEmailVerified,
  );

  // updated_at should change after the update.
  TestValidator.notEquals(
    "updated_at should change after admin update",
    updatedSeller.updated_at,
    sellerUpdatedAtBeforeUpdate,
  );

  // deleted_at should remain null or undefined (no soft delete performed).
  TestValidator.equals(
    "updated seller is not soft-deleted (deleted_at remains null)",
    updatedSeller.deleted_at ?? null,
    null,
  );

  // 5. Fetch seller details via admin detail endpoint.
  const sellerDetail: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.at(connection, {
      sellerId,
    });
  typia.assert(sellerDetail);

  // 6. Detail response should be consistent with the update response.
  TestValidator.equals(
    "detail id matches updated seller id",
    sellerDetail.id,
    updatedSeller.id,
  );
  TestValidator.equals(
    "detail email matches updated seller email",
    sellerDetail.email,
    updatedSeller.email,
  );
  TestValidator.equals(
    "detail status matches updated seller status",
    sellerDetail.status,
    updatedSeller.status,
  );
  TestValidator.equals(
    "detail email_verified matches updated seller email_verified",
    sellerDetail.email_verified,
    updatedSeller.email_verified,
  );
  TestValidator.equals(
    "detail created_at matches updated seller created_at",
    sellerDetail.created_at,
    updatedSeller.created_at,
  );
  TestValidator.equals(
    "detail updated_at matches updated seller updated_at",
    sellerDetail.updated_at,
    updatedSeller.updated_at,
  );
  TestValidator.equals(
    "detail deleted_at remains null (no soft delete)",
    sellerDetail.deleted_at ?? null,
    updatedSeller.deleted_at ?? null,
  );
}
