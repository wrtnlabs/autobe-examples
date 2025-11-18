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

export async function test_api_admin_update_seller_basic_fields(
  connection: api.IConnection,
) {
  // 1. Create and authenticate an initial admin (to ensure connection is capable of admin auth)
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const firstAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(firstAdmin);

  // 2. Create a seller via public join API (this will switch Authorization to seller)
  const sellerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const authorizedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinInput,
    });
  typia.assert(authorizedSeller);

  const originalSellerId = authorizedSeller.id;
  const originalEmail = authorizedSeller.email;
  const originalStatus = authorizedSeller.status;
  const originalEmailVerified = authorizedSeller.email_verified;
  const originalCreatedAt = authorizedSeller.created_at;
  const originalUpdatedAt = authorizedSeller.updated_at;
  const originalDeletedAt = authorizedSeller.deleted_at ?? null;

  // 3. Re-authenticate as admin (this will restore admin Authorization)
  const secondAdminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const secondAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: secondAdminJoinInput,
    });
  typia.assert(secondAdmin);

  // 4. Prepare update payload with new email, status, and flipped email_verified
  const newEmail = typia.random<string & tags.Format<"email">>();
  const newStatusBaseOptions = [
    "pending_review",
    "active",
    "suspended",
    "terminated",
  ] as const;
  const newStatusCandidates = newStatusBaseOptions.filter(
    (status) => status !== originalStatus,
  );
  const newStatus =
    newStatusCandidates.length > 0
      ? RandomGenerator.pick(newStatusCandidates)
      : originalStatus;
  const newEmailVerified = !originalEmailVerified;

  const updateBody = {
    email: newEmail,
    status: newStatus,
    email_verified: newEmailVerified,
  } satisfies IShoppingMallSeller.IUpdate;

  // 5. Call admin seller update API
  const updatedSeller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.update(connection, {
      sellerId: originalSellerId,
      body: updateBody,
    });
  typia.assert(updatedSeller);

  // 6. Validate business semantics on updated seller
  TestValidator.equals(
    "seller id should remain unchanged after admin update",
    updatedSeller.id,
    originalSellerId,
  );

  TestValidator.equals(
    "seller email should be updated to new email",
    updatedSeller.email,
    newEmail,
  );

  TestValidator.equals(
    "seller status should be updated to new status",
    updatedSeller.status,
    newStatus,
  );

  TestValidator.equals(
    "seller email_verified should match payload",
    updatedSeller.email_verified,
    newEmailVerified,
  );

  TestValidator.equals(
    "seller created_at should remain unchanged after update",
    updatedSeller.created_at,
    originalCreatedAt,
  );

  TestValidator.notEquals(
    "seller updated_at should change after update",
    updatedSeller.updated_at,
    originalUpdatedAt,
  );

  const updatedDeletedAt = updatedSeller.deleted_at ?? null;
  TestValidator.equals(
    "seller deleted_at should not be modified by basic update",
    updatedDeletedAt,
    originalDeletedAt,
  );

  // 7. Unauthorized edge case: attempt update without Authorization header
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "admin seller update should fail without Authorization header",
    async () => {
      await api.functional.shoppingMall.admin.sellers.update(unauthConnection, {
        sellerId: originalSellerId,
        body: updateBody,
      });
    },
  );
}
