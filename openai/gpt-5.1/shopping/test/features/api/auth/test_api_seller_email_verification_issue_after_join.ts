import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerEmailVerificationIssue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEmailVerificationIssue";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";

/**
 * Verify that an authenticated seller can request email verification issuance
 * immediately after joining.
 *
 * Business flow:
 *
 * 1. Register a new seller via POST /auth/seller/join with unique credentials.
 * 2. Use the same authenticated connection to call POST
 *    /auth/seller/email/verification/issue with the same email.
 * 3. Assert that the issuance response indicates success and returns a non-empty
 *    human-readable message.
 * 4. Call the issuance endpoint a second time with the same email to ensure
 *    repeated requests still succeed on the happy path.
 */
export async function test_api_seller_email_verification_issue_after_join(
  connection: api.IConnection,
) {
  // 1. Join a new seller with random but valid data.
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    storeName: RandomGenerator.name(),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const authorizedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinRequestBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(authorizedSeller);

  // Ensure the seller email in the response matches the join request email.
  TestValidator.equals(
    "joined seller email matches request",
    authorizedSeller.email,
    joinRequestBody.email,
  );

  // 2. Issue email verification using the same email.
  const issueRequestBody = {
    email: authorizedSeller.email,
  } satisfies IShoppingMallSellerEmailVerificationIssue.IRequest;

  const firstIssueResponse: IShoppingMallSellerEmailVerificationIssue.IResponse =
    await api.functional.auth.seller.email.verification.issue.issueEmailVerification(
      connection,
      {
        body: issueRequestBody,
      },
    );
  typia.assert<IShoppingMallSellerEmailVerificationIssue.IResponse>(
    firstIssueResponse,
  );

  TestValidator.predicate(
    "first verification issuance success flag is true",
    firstIssueResponse.success === true,
  );
  TestValidator.predicate(
    "first verification issuance message is non-empty",
    firstIssueResponse.message.length > 0,
  );

  // 3. Call the issuance endpoint again with the same email to ensure
  //    repeated requests are still handled as successful in the happy path.
  const secondIssueResponse: IShoppingMallSellerEmailVerificationIssue.IResponse =
    await api.functional.auth.seller.email.verification.issue.issueEmailVerification(
      connection,
      {
        body: issueRequestBody,
      },
    );
  typia.assert<IShoppingMallSellerEmailVerificationIssue.IResponse>(
    secondIssueResponse,
  );

  TestValidator.predicate(
    "second verification issuance success flag is true",
    secondIssueResponse.success === true,
  );
  TestValidator.predicate(
    "second verification issuance message is non-empty",
    secondIssueResponse.message.length > 0,
  );
}
