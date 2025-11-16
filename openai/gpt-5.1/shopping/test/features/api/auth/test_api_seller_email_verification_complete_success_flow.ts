import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerEmailVerificationComplete } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEmailVerificationComplete";
import type { IShoppingMallSellerEmailVerificationIssue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEmailVerificationIssue";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";

/**
 * End-to-end structural test for the seller email verification completion flow.
 *
 * This test exercises the following high-level steps:
 *
 * 1. Register a new seller via POST /auth/seller/join and obtain an authenticated
 *    seller session (IShoppingMallSeller.IAuthorized).
 * 2. While authenticated as that seller, request issuance of an email verification
 *    token via POST /auth/seller/email/verification/issue.
 * 3. Attempt to complete email verification via POST
 *    /auth/seller/email/verification/complete using an opaque token string,
 *    asserting the response contract and simple invariants.
 *
 * Due to the absence of any API for retrieving the raw verification token
 * value, this test focuses on type- and contract-level validation and on
 * verifying that a successful completion response implies
 * `requiresAdditionalAction === false` for the simplest path.
 */
export async function test_api_seller_email_verification_complete_success_flow(
  connection: api.IConnection,
) {
  // 1. Register (join) a new seller.
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const joinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(16),
    storeName: RandomGenerator.paragraph({ sentences: 2 }),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const joinedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(joinedSeller);

  // 2. Issue an email verification token for this seller.
  const issueBody = {
    email: sellerEmail,
  } satisfies IShoppingMallSellerEmailVerificationIssue.IRequest;

  const issueResponse: IShoppingMallSellerEmailVerificationIssue.IResponse =
    await api.functional.auth.seller.email.verification.issue.issueEmailVerification(
      connection,
      { body: issueBody },
    );
  typia.assert<IShoppingMallSellerEmailVerificationIssue.IResponse>(
    issueResponse,
  );

  // Expect the issuance call to succeed on the happy path.
  TestValidator.predicate(
    "seller email verification issuance should succeed",
    () => issueResponse.success === true,
  );

  // 3. Attempt to complete email verification with an opaque token string.
  // Since we cannot obtain a real token, we generate a random opaque string.
  const dummyToken: string = RandomGenerator.alphaNumeric(48);

  const completeBody = {
    token: dummyToken,
  } satisfies IShoppingMallSellerEmailVerificationComplete.IRequest;

  const completeResponse: IShoppingMallSellerEmailVerificationComplete.IResponse =
    await api.functional.auth.seller.email.verification.complete.completeEmailVerification(
      connection,
      { body: completeBody },
    );
  typia.assert<IShoppingMallSellerEmailVerificationComplete.IResponse>(
    completeResponse,
  );

  // Basic invariants on the completion response.
  TestValidator.predicate(
    "completion response message must be a non-empty string",
    () => completeResponse.message.length > 0,
  );

  // If success is true, additional action should not be required for the
  // simplest verified state.
  if (completeResponse.success === true) {
    TestValidator.equals(
      "successful email verification should not require additional action",
      completeResponse.requiresAdditionalAction,
      false,
    );
  }
}
