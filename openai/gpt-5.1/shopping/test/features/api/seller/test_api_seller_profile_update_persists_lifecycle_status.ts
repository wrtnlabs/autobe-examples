import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerEmailVerificationIssue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEmailVerificationIssue";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";

/**
 * Validate that seller profile updates to non-lifecycle fields preserve
 * lifecycle status and logical deletion flags while bumping updated_at.
 *
 * Business flow:
 *
 * 1. Join as a seller to obtain an authenticated seller session and initial
 *    lifecycle metadata (status, created_at, updated_at, deleted_at).
 * 2. Issue an email verification to mirror typical onboarding (no strict
 *    assertions other than type validation).
 * 3. Perform a self-service seller profile update via PUT
 *    /shoppingMall/seller/sellers/{sellerId}, changing only store_name and
 *    contact_phone.
 * 4. Ensure that id, created_at, status, and deleted_at are preserved (status
 *    unchanged, deleted_at still null/undefined), while updated_at advances and
 *    the updated profile fields reflect the new values.
 */
export async function test_api_seller_profile_update_persists_lifecycle_status(
  connection: api.IConnection,
) {
  // 1. Register a new seller and capture initial lifecycle metadata
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    storeName: RandomGenerator.paragraph({ sentences: 2 }),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const authorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  const originalStatus = authorized.status;
  const originalCreatedAt = authorized.created_at;
  const originalUpdatedAt = authorized.updated_at;
  const originalDeletedAt = authorized.deleted_at ?? null;
  const originalEmail = authorized.email;

  // 2. Issue email verification for the seller email
  const verificationBody = {
    email: authorized.email,
  } satisfies IShoppingMallSellerEmailVerificationIssue.IRequest;

  const verificationOutput: IShoppingMallSellerEmailVerificationIssue.IResponse =
    await api.functional.auth.seller.email.verification.issue.issueEmailVerification(
      connection,
      {
        body: verificationBody,
      },
    );
  typia.assert(verificationOutput);

  // 3. Update seller profile: change only store_name and contact_phone
  const updatedStoreName = RandomGenerator.paragraph({ sentences: 2 });
  const updatedContactPhone = RandomGenerator.mobile();

  const updateBody = {
    store_name: updatedStoreName,
    contact_phone: updatedContactPhone,
  } satisfies IShoppingMallSeller.IUpdate;

  const updated: IShoppingMallSeller =
    await api.functional.shoppingMall.seller.sellers.update(connection, {
      sellerId: authorized.id,
      body: updateBody,
    });
  typia.assert(updated);

  // 4. Business assertions
  // 4-1. Identity and lifecycle fields
  TestValidator.equals(
    "seller id remains unchanged after profile update",
    updated.id,
    authorized.id,
  );

  TestValidator.equals(
    "seller status remains unchanged when not updated",
    updated.status,
    originalStatus,
  );

  TestValidator.equals(
    "seller created_at timestamp remains unchanged",
    updated.created_at,
    originalCreatedAt,
  );

  // deleted_at should still be null/undefined (no logical deletion)
  const normalizedDeletedAt = updated.deleted_at ?? null;
  TestValidator.equals(
    "seller deleted_at remains null/undefined after non-deleting update",
    normalizedDeletedAt,
    originalDeletedAt,
  );

  // 4-2. Audit timestamp behavior: updated_at must advance
  TestValidator.notEquals(
    "seller updated_at changes after profile update",
    updated.updated_at,
    originalUpdatedAt,
  );

  // 4-3. Profile fields updated as requested
  TestValidator.equals(
    "seller store_name reflects updated value",
    updated.store_name,
    updatedStoreName,
  );

  const normalizedContactPhone = updated.contact_phone ?? null;
  TestValidator.equals(
    "seller contact_phone reflects updated value",
    normalizedContactPhone,
    updatedContactPhone,
  );

  // 4-4. Email remains unchanged
  TestValidator.equals(
    "seller email remains unchanged when not updated",
    updated.email,
    originalEmail,
  );
}
