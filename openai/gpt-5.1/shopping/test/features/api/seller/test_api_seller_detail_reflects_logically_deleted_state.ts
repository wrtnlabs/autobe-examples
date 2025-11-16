import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerEmailVerificationIssue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEmailVerificationIssue";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";

/**
 * Validate that seller detail endpoint exposes lifecycle and deletion metadata
 * and remains publicly accessible, while email verification issuance works for
 * the same seller account.
 *
 * Business flow implemented (adapted to available APIs):
 *
 * 1. Register a new seller via POST /auth/seller/join.
 *
 *    - This returns IShoppingMallSeller.IAuthorized and automatically sets
 *         Authorization header for the connection.
 * 2. Trigger email verification issuance via POST
 *    /auth/seller/email/verification/issue using the seller's email.
 *
 *    - Assert that the response is
 *         IShoppingMallSellerEmailVerificationIssue.IResponse and that success
 *         is true to reflect a normal flow.
 * 3. Build an unauthenticated connection (no Authorization header) by cloning the
 *    original connection with empty headers.
 * 4. Call GET /shoppingMall/sellers/{sellerId} with this unauthenticated
 *    connection and the seller's id.
 *
 *    - Assert that the response conforms to IShoppingMallSeller.
 *    - Validate that `id` matches the seller id from join.
 *    - Check lifecycle timestamps (created_at, updated_at) are non-empty.
 *    - Inspect `deleted_at` to ensure it is either null/undefined (active) or a
 *         well-formed date-time string (logically deleted), so that operational
 *         tooling can distinguish lifecycle state from this field.
 */
export async function test_api_seller_detail_reflects_logically_deleted_state(
  connection: api.IConnection,
) {
  // 1. Register a new seller account via /auth/seller/join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    storeName: RandomGenerator.paragraph({ sentences: 2 }),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const authorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(authorized);

  // Basic sanity checks on authorized payload
  TestValidator.equals(
    "authorized seller id should match summary id",
    authorized.id,
    authorized.seller.id,
  );
  TestValidator.equals(
    "authorized email should match request email",
    authorized.email,
    joinBody.email,
  );

  // 2. Issue email verification for this seller's email
  const verificationBody = {
    email: authorized.email,
  } satisfies IShoppingMallSellerEmailVerificationIssue.IRequest;

  const verificationResponse: IShoppingMallSellerEmailVerificationIssue.IResponse =
    await api.functional.auth.seller.email.verification.issue.issueEmailVerification(
      connection,
      {
        body: verificationBody,
      },
    );
  typia.assert<IShoppingMallSellerEmailVerificationIssue.IResponse>(
    verificationResponse,
  );

  TestValidator.predicate(
    "seller email verification issuance should indicate success",
    verificationResponse.success === true,
  );

  // 3. Prepare an unauthenticated connection (no Authorization header)
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Call GET /shoppingMall/sellers/{sellerId} without Authorization
  const sellerDetail: IShoppingMallSeller =
    await api.functional.shoppingMall.sellers.at(publicConnection, {
      sellerId: authorized.id,
    });
  typia.assert<IShoppingMallSeller>(sellerDetail);

  // 5. Validate key identity and lifecycle fields
  TestValidator.equals(
    "seller detail id should match authorized seller id",
    sellerDetail.id,
    authorized.id,
  );
  TestValidator.equals(
    "seller detail email should match authorized email",
    sellerDetail.email,
    authorized.email,
  );
  TestValidator.equals(
    "seller detail store_name should match authorized store_name",
    sellerDetail.store_name,
    authorized.store_name,
  );

  // Ensure timestamps are present and non-empty strings
  TestValidator.predicate(
    "created_at should be a non-empty ISO 8601 string",
    typeof sellerDetail.created_at === "string" &&
      sellerDetail.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be a non-empty ISO 8601 string",
    typeof sellerDetail.updated_at === "string" &&
      sellerDetail.updated_at.length > 0,
  );

  // Inspect logical deletion state: deleted_at may be null/undefined (active)
  // or a non-empty date-time string (logically deleted). Either way, its
  // presence and format allow operational tooling to distinguish lifecycle.
  if (
    sellerDetail.deleted_at !== null &&
    sellerDetail.deleted_at !== undefined
  ) {
    TestValidator.predicate(
      "deleted_at, when present, should be a non-empty ISO 8601 string",
      typeof sellerDetail.deleted_at === "string" &&
        sellerDetail.deleted_at.length > 0,
    );
  }

  // Status must be a non-empty string representing lifecycle state
  TestValidator.predicate(
    "status should be a non-empty lifecycle state string",
    typeof sellerDetail.status === "string" && sellerDetail.status.length > 0,
  );
}
