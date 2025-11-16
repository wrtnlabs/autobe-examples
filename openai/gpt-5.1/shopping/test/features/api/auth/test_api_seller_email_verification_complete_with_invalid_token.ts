import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerEmailVerificationComplete } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEmailVerificationComplete";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";

/**
 * Validate seller email verification completion failure with invalid token.
 *
 * Business purpose: Ensure that when a seller follows an email verification
 * completion flow with an invalid or non-existent token, the backend does not
 * mark any email as verified and instead responds with a failure result that
 * instructs the client to perform further action.
 *
 * Scenario steps:
 *
 * 1. Register a new seller via /auth/seller/join to simulate a realistic seller
 *    context. This also ensures the connection has an Authorization header set
 *    by the SDK, although the completion endpoint itself does not require
 *    authentication.
 * 2. Generate an obviously invalid verification token (random alpha-numeric
 *    string) that is not associated with any existing email_verification_tokens
 *    row.
 * 3. Invoke /auth/seller/email/verification/complete with a request body
 *    containing the invalid token, conforming to
 *    IShoppingMallSellerEmailVerificationComplete.IRequest.
 * 4. Assert that the response conforms to
 *    IShoppingMallSellerEmailVerificationComplete.IResponse and that:
 *
 *    - Success is false.
 *    - RequiresAdditionalAction is true.
 *    - Message is a non-empty string.
 *
 * Notes:
 *
 * - We intentionally avoid any HTTP-status-based assertions and rely only on the
 *   business-level response DTO.
 * - We also avoid touching connection.headers directly; token handling is managed
 *   by the SDK inside the join call.
 */
export async function test_api_seller_email_verification_complete_with_invalid_token(
  connection: api.IConnection,
) {
  // 1. Register a realistic seller account to simulate platform usage.
  const joinBody = typia.random<IShoppingMallSellerJoin.IRequest>();

  const seller = await api.functional.auth.seller.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller);

  // 2. Generate an obviously invalid verification token.
  //    Using a sufficiently long random alpha-numeric string makes
  //    collision with any real token practically impossible.
  const invalidToken: string = RandomGenerator.alphaNumeric(64);

  // 3. Attempt to complete email verification with the invalid token.
  const response =
    await api.functional.auth.seller.email.verification.complete.completeEmailVerification(
      connection,
      {
        body: {
          token: invalidToken,
        } satisfies IShoppingMallSellerEmailVerificationComplete.IRequest,
      },
    );

  // 4. Type-level assertion: ensure the response matches the declared DTO.
  typia.assert<IShoppingMallSellerEmailVerificationComplete.IResponse>(
    response,
  );

  // 5. Business rule assertions.
  TestValidator.equals(
    "email verification completion with invalid token must fail",
    response.success,
    false,
  );

  TestValidator.equals(
    "invalid token should require additional action from seller",
    response.requiresAdditionalAction,
    true,
  );

  TestValidator.predicate(
    "failure message for invalid token must be a non-empty string",
    () => typeof response.message === "string" && response.message.length > 0,
  );
}
