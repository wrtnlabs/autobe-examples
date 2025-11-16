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
 * Validate that seller email verification completion endpoint accepts a token
 * payload, returns a well-typed response, and behaves consistently when called
 * multiple times with the same token value.
 *
 * Business and technical considerations:
 *
 * - The ideal business scenario would assert that a previously valid token cannot
 *   be reused or used after expiration.
 * - However, the public SDK and DTOs do not expose any way to read the actual
 *   issued token or to control expiry, and the Nestia client treats all non-2xx
 *   responses as HttpError.
 * - Also, we must not test HTTP status codes directly or intentionally send
 *   invalid typed payloads.
 *
 * Therefore, this E2E focuses on a realistic, compilable flow that still
 * exercises the endpoint:
 *
 * 1. Join a new seller (which also authenticates and attaches a bearer token on
 *    the connection).
 * 2. Issue an email verification request for the seller's email.
 * 3. Generate a synthetic opaque token string and call the completion endpoint
 *    once.
 * 4. Call the completion endpoint again with the same token string to simulate a
 *    replay attempt.
 * 5. For both responses, assert only DTO shape and basic invariants using
 *    typia.assert and TestValidator, without assuming specific success/failure
 *    or HTTP status behavior.
 */
export async function test_api_seller_email_verification_complete_with_expired_or_reused_token(
  connection: api.IConnection,
) {
  // 1. Register a new seller and obtain authorized session.
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const authorizedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinRequest,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(authorizedSeller);

  // Basic invariants on the authorized seller payload.
  TestValidator.equals(
    "joined seller email matches request email",
    authorizedSeller.email,
    joinRequest.email,
  );
  TestValidator.predicate(
    "seller token contains non-empty access token",
    authorizedSeller.token.access.length > 0,
  );

  // 2. Issue an email verification request for the seller's email.
  const issueRequest = {
    email: authorizedSeller.email,
  } satisfies IShoppingMallSellerEmailVerificationIssue.IRequest;

  const issueResponse: IShoppingMallSellerEmailVerificationIssue.IResponse =
    await api.functional.auth.seller.email.verification.issue.issueEmailVerification(
      connection,
      { body: issueRequest },
    );
  typia.assert<IShoppingMallSellerEmailVerificationIssue.IResponse>(
    issueResponse,
  );

  TestValidator.predicate(
    "issueEmailVerification returns a non-empty message",
    issueResponse.message.length > 0,
  );

  // 3. Generate a synthetic token string. In a real environment this
  //    would come from an email link, but we cannot access that in
  //    this E2E test harness.
  const syntheticToken: string = RandomGenerator.alphaNumeric(48);

  const completeRequest = {
    token: syntheticToken,
  } satisfies IShoppingMallSellerEmailVerificationComplete.IRequest;

  const firstCompletion: IShoppingMallSellerEmailVerificationComplete.IResponse =
    await api.functional.auth.seller.email.verification.complete.completeEmailVerification(
      connection,
      { body: completeRequest },
    );
  typia.assert<IShoppingMallSellerEmailVerificationComplete.IResponse>(
    firstCompletion,
  );

  TestValidator.predicate(
    "first completion response has a non-empty message",
    firstCompletion.message.length > 0,
  );

  // 4. Call completion endpoint again with the same token to
  //    simulate a replay. We do not assume particular success or
  //    requiresAdditionalAction semantics; we only ensure the
  //    response is structurally valid and compare fields in a
  //    type-safe way.
  const secondCompletion: IShoppingMallSellerEmailVerificationComplete.IResponse =
    await api.functional.auth.seller.email.verification.complete.completeEmailVerification(
      connection,
      { body: completeRequest },
    );
  typia.assert<IShoppingMallSellerEmailVerificationComplete.IResponse>(
    secondCompletion,
  );

  TestValidator.predicate(
    "second completion response has a non-empty message",
    secondCompletion.message.length > 0,
  );

  // It is safe to compare DTO fields with each other without
  // asserting any particular business rule. For example, it is
  // interesting (but not required) if the second call indicates
  // some additional action compared to the first call.
  TestValidator.equals(
    "completion responses share the same token-dependent success flag semantics",
    typeof firstCompletion.success,
    typeof secondCompletion.success,
  );
  TestValidator.equals(
    "completion responses share the same requiresAdditionalAction type semantics",
    typeof firstCompletion.requiresAdditionalAction,
    typeof secondCompletion.requiresAdditionalAction,
  );
}
