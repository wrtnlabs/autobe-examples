import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerEmailVerificationIssue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEmailVerificationIssue";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";

/**
 * Verify seller email verification issuance rejects mismatched email and
 * accepts the correct one.
 *
 * Business goal
 *
 * - Ensure that a seller, already registered and authenticated, cannot request an
 *   email verification token for an email address that does not belong to their
 *   credentials, while still allowing a successful issuance when the email
 *   matches.
 *
 * High-level flow
 *
 * 1. Register a new seller via POST /auth/seller/join with valid credentials and
 *    profile.
 * 2. Capture the returned authorized seller session, including the canonical
 *    seller email.
 * 3. Construct a syntactically valid email that is guaranteed to differ from the
 *    seller’s email.
 * 4. While authenticated as this seller (SDK stores token in the connection),
 *    attempt to issue an email verification with the mismatched email; expect
 *    an error.
 * 5. Then attempt to issue an email verification with the correct seller email and
 *    expect success.
 * 6. Validate both behaviors using TestValidator and typia.assert without
 *    inspecting HTTP status codes.
 */
export async function test_api_seller_email_verification_issue_with_mismatched_email(
  connection: api.IConnection,
) {
  // 1. Register a new seller (join) with valid data
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    storeName: RandomGenerator.name(),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const authorizedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(authorizedSeller);

  // Basic logical sanity checks on join result
  TestValidator.equals(
    "seller email in response matches join email",
    authorizedSeller.email,
    joinBody.email,
  );
  TestValidator.predicate(
    "seller id is non-empty UUID-like string",
    () => authorizedSeller.id.length > 0,
  );

  // 2. Build a mismatched, but valid, email address
  const originalEmail: string & tags.Format<"email"> = authorizedSeller.email;

  // Simple way to guarantee difference: change local-part prefix
  const mismatchedEmailLocalPart = `${RandomGenerator.alphabets(8)}.mismatch`;
  const atIndex = originalEmail.indexOf("@");
  const domainPart =
    atIndex === -1 ? "example.com" : originalEmail.slice(atIndex + 1);
  const mismatchedEmail = `${mismatchedEmailLocalPart}@${domainPart}`;

  TestValidator.predicate(
    "mismatched email is different from original",
    () => mismatchedEmail !== originalEmail,
  );

  const mismatchedIssueBody = {
    email: mismatchedEmail,
  } satisfies IShoppingMallSellerEmailVerificationIssue.IRequest;

  // 3. Attempt to issue email verification for the mismatched email
  await TestValidator.error(
    "issuing verification for mismatched seller email should fail",
    async () => {
      await api.functional.auth.seller.email.verification.issue.issueEmailVerification(
        connection,
        {
          body: mismatchedIssueBody,
        },
      );
    },
  );

  // 4. Attempt issuance with the correct email and expect success
  const correctIssueBody = {
    email: originalEmail,
  } satisfies IShoppingMallSellerEmailVerificationIssue.IRequest;

  const successResponse: IShoppingMallSellerEmailVerificationIssue.IResponse =
    await api.functional.auth.seller.email.verification.issue.issueEmailVerification(
      connection,
      {
        body: correctIssueBody,
      },
    );
  typia.assert<IShoppingMallSellerEmailVerificationIssue.IResponse>(
    successResponse,
  );

  // 5. Logical checks on successful response
  TestValidator.predicate(
    "successful verification issuance response has non-empty message",
    () => successResponse.message.length > 0,
  );
}
