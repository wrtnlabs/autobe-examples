import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerEmailVerificationIssue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEmailVerificationIssue";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";

/**
 * Validate that an authenticated seller can clear an optional nullable profile
 * field (contact_phone) while preserving required/system-managed fields and
 * keeping the seller logically active.
 *
 * Business workflow validated:
 *
 * 1. Register a new seller with a non-null contactPhone via POST
 *    /auth/seller/join.
 * 2. Optionally issue a seller email verification token to simulate a realistic
 *    onboarding flow via POST /auth/seller/email/verification/issue.
 * 3. Update the seller profile via PUT /shoppingMall/seller/sellers/{sellerId}
 *    using IShoppingMallSeller.IUpdate, explicitly setting contact_phone to
 *    null while omitting other fields so they remain unchanged.
 * 4. Verify that contact_phone is now null in the returned IShoppingMallSeller,
 *    identity fields are preserved, status is unchanged, and deleted_at remains
 *    null (no logical deletion).
 */
export async function test_api_seller_profile_optional_field_clearing(
  connection: api.IConnection,
) {
  // 1. Register seller with non-null contactPhone
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const authorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(authorized);

  // Basic sanity checks on initial seller state
  TestValidator.predicate(
    "initial seller id must be non-empty uuid-like string",
    () => authorized.id.length > 0,
  );
  TestValidator.predicate(
    "initial seller status must be non-empty",
    () => authorized.status.length > 0,
  );

  const originalStatus: string = authorized.status;
  const originalEmail: string = authorized.email;
  const originalStoreName: string = authorized.store_name;
  const originalCreatedAt: string = authorized.created_at;
  const originalUpdatedAt: string = authorized.updated_at;

  // 2. Issue email verification for realism (does not affect main logic)
  const emailVerificationBody = {
    email: originalEmail,
  } satisfies IShoppingMallSellerEmailVerificationIssue.IRequest;

  const verificationResult: IShoppingMallSellerEmailVerificationIssue.IResponse =
    await api.functional.auth.seller.email.verification.issue.issueEmailVerification(
      connection,
      {
        body: emailVerificationBody,
      },
    );
  typia.assert<IShoppingMallSellerEmailVerificationIssue.IResponse>(
    verificationResult,
  );

  // 3. Update seller profile: clear contact_phone by setting it to null
  const updateBody = {
    contact_phone: null,
  } satisfies IShoppingMallSeller.IUpdate;

  const updated: IShoppingMallSeller =
    await api.functional.shoppingMall.seller.sellers.update(connection, {
      sellerId: authorized.id,
      body: updateBody,
    });
  typia.assert<IShoppingMallSeller>(updated);

  // 4. Validate invariants and field changes

  // Identity should be preserved
  TestValidator.equals(
    "seller id preserved after contact_phone clearing",
    updated.id,
    authorized.id,
  );
  TestValidator.equals(
    "email preserved after contact_phone clearing",
    updated.email,
    originalEmail,
  );
  TestValidator.equals(
    "store_name preserved after contact_phone clearing",
    updated.store_name,
    originalStoreName,
  );

  // contact_phone must now be null
  TestValidator.predicate(
    "contact_phone cleared to null",
    () => updated.contact_phone === null,
  );

  // Status unchanged
  TestValidator.equals(
    "seller status unchanged after optional field clearing",
    updated.status,
    originalStatus,
  );

  // deleted_at should remain null (no logical deletion)
  TestValidator.predicate(
    "seller not logically deleted after contact_phone clearing",
    () => updated.deleted_at === null || updated.deleted_at === undefined,
  );

  // created_at should be identical; updated_at should be >= previous value
  TestValidator.equals(
    "created_at timestamp preserved after update",
    updated.created_at,
    originalCreatedAt,
  );

  TestValidator.predicate(
    "updated_at is not earlier than original updated_at",
    () => updated.updated_at >= originalUpdatedAt,
  );
}
