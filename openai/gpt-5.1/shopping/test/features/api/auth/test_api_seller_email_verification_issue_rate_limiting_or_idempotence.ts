import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerEmailVerificationIssue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEmailVerificationIssue";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";

export async function test_api_seller_email_verification_issue_rate_limiting_or_idempotence(
  connection: api.IConnection,
) {
  // 1. Register a new seller and obtain authenticated session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.paragraph({ sentences: 2 }),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const authorizedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(authorizedSeller);

  // 2. First email verification issue call using seller's email
  const firstIssueBody = {
    email: authorizedSeller.email,
  } satisfies IShoppingMallSellerEmailVerificationIssue.IRequest;

  const firstResponse: IShoppingMallSellerEmailVerificationIssue.IResponse =
    await api.functional.auth.seller.email.verification.issue.issueEmailVerification(
      connection,
      {
        body: firstIssueBody,
      },
    );
  typia.assert<IShoppingMallSellerEmailVerificationIssue.IResponse>(
    firstResponse,
  );

  TestValidator.predicate(
    "first email verification issue call should succeed",
    firstResponse.success === true,
  );

  // 3. Repeat the email verification issue call multiple times
  const repeatCount = 4;
  const responses: IShoppingMallSellerEmailVerificationIssue.IResponse[] = [];

  for (let i = 0; i < repeatCount; i++) {
    const body = {
      email: authorizedSeller.email,
    } satisfies IShoppingMallSellerEmailVerificationIssue.IRequest;

    const response =
      await api.functional.auth.seller.email.verification.issue.issueEmailVerification(
        connection,
        {
          body,
        },
      );
    typia.assert<IShoppingMallSellerEmailVerificationIssue.IResponse>(response);
    responses.push(response);
  }

  // 4. Validate consistent success across all repeated calls
  for (let i = 0; i < responses.length; i++) {
    const response = responses[i];
    TestValidator.predicate(
      `repeated email verification issue call #${i + 1} should succeed`,
      response.success === true,
    );
  }

  // 5. Ensure message is non-empty to confirm meaningful response
  for (let i = 0; i < responses.length; i++) {
    const response = responses[i];
    TestValidator.predicate(
      `repeated email verification issue call #${i + 1} should contain non-empty message`,
      response.message.length > 0,
    );
  }
}
