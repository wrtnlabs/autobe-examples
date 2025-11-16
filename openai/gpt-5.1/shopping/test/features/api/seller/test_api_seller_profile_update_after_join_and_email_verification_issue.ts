import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerEmailVerificationIssue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEmailVerificationIssue";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";

/**
 * Validate that a newly joined seller can update their own seller profile after
 * issuing an email verification request.
 *
 * Business flow covered by this test:
 *
 * 1. Join as a new seller using POST /auth/seller/join.
 * 2. Issue an email verification using POST /auth/seller/email/verification/issue
 *    while authenticated as that seller.
 * 3. Update the seller profile using PUT /shoppingMall/seller/sellers/{sellerId}
 *    for the same seller, changing mutable fields (store_name, contact_phone)
 *    while leaving immutable and credential‑bound fields (id, email,
 *    created_at) unchanged.
 * 4. Assert that the update result preserves identity and lifecycle fields while
 *    reflecting the new profile values.
 */
export async function test_api_seller_profile_update_after_join_and_email_verification_issue(
  connection: api.IConnection,
) {
  // 1. Register a new seller via /auth/seller/join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const authorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  const originalId = authorized.id;
  const originalEmail = authorized.email;
  const originalStoreName = authorized.store_name;
  const originalContactPhone = authorized.contact_phone;
  const originalStatus = authorized.status;
  const originalCreatedAt = authorized.created_at;
  const originalUpdatedAt = authorized.updated_at;
  const originalDeletedAt = authorized.deleted_at;

  // 2. Issue email verification for this seller's email
  const emailRequest = {
    email: authorized.email,
  } satisfies IShoppingMallSellerEmailVerificationIssue.IRequest;

  const emailIssueResponse: IShoppingMallSellerEmailVerificationIssue.IResponse =
    await api.functional.auth.seller.email.verification.issue.issueEmailVerification(
      connection,
      {
        body: emailRequest,
      },
    );
  typia.assert(emailIssueResponse);

  await TestValidator.predicate(
    "email verification issuance should succeed",
    async () => emailIssueResponse.success === true,
  );

  // 3. Update seller profile for the same seller
  const updatedStoreName = `${originalStoreName} ${RandomGenerator.name(1)}`;
  const updatedContactPhone =
    originalContactPhone !== null && originalContactPhone !== undefined
      ? `${originalContactPhone}-ext`
      : RandomGenerator.mobile("011");

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

  // 4. Business assertions on update result
  TestValidator.equals(
    "seller id should remain unchanged",
    updated.id,
    originalId,
  );

  TestValidator.equals(
    "email should remain unchanged",
    updated.email,
    originalEmail,
  );

  TestValidator.equals(
    "store_name should be updated to new value",
    updated.store_name,
    updatedStoreName,
  );

  TestValidator.equals(
    "contact_phone should match updated value",
    updated.contact_phone,
    updatedContactPhone,
  );

  TestValidator.equals(
    "created_at should remain unchanged",
    updated.created_at,
    originalCreatedAt,
  );

  TestValidator.notEquals(
    "updated_at should change after profile update",
    updated.updated_at,
    originalUpdatedAt,
  );

  TestValidator.equals(
    "status should remain in the same lifecycle state",
    updated.status,
    originalStatus,
  );

  TestValidator.equals(
    "deleted_at should remain unchanged (no logical deletion)",
    updated.deleted_at,
    originalDeletedAt,
  );
}
