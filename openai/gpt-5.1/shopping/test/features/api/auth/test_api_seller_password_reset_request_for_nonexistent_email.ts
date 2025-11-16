import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallSellerPasswordResetRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordResetRequest";

/**
 * Validate that seller password reset initiation does not leak account
 * existence when called with a non-existent email address.
 *
 * Business goal:
 *
 * - The password reset endpoint must behave identically (from the client's
 *   perspective) whether the seller email exists or not, to avoid user
 *   enumeration.
 *
 * Scenario:
 *
 * 1. Generate a synthetic seller email address on a reserved test-only domain that
 *    should never be present in production data.
 * 2. Call POST /auth/seller/password/reset/request with this email using the SDK
 *    function
 *    `api.functional.auth.seller.password.reset.request.requestPasswordReset`.
 * 3. Validate the response structure via `typia.assert`.
 * 4. Assert that `success` is `true` to confirm the API does not reveal
 *    non-existence via a boolean flag for syntactically valid requests.
 * 5. Assert that `message` is a non-empty string, representing a generic
 *    acknowledgment message suitable for user display.
 * 6. Do not attempt to inspect HTTP status codes or database state; this test
 *    treats the operation as a normal success path and only uses observable
 *    response fields.
 */
export async function test_api_seller_password_reset_request_for_nonexistent_email(
  connection: api.IConnection,
) {
  // 1. Prepare a guaranteed-nonexistent seller email address.
  const localPart: string = RandomGenerator.alphabets(16);
  const nonexistentEmail: string & tags.Format<"email"> =
    `${localPart}@nonexistent-seller-test.example.invalid` as string &
      tags.Format<"email">;

  const requestBody = {
    email: nonexistentEmail,
  } satisfies IShoppingMallSellerPasswordResetRequest.IRequest;

  // 2. Call the password reset initiation endpoint with the nonexistent email.
  const response: IShoppingMallSellerPasswordResetRequest.IResponse =
    await api.functional.auth.seller.password.reset.request.requestPasswordReset(
      connection,
      {
        body: requestBody,
      },
    );

  // 3. Validate the response type structure.
  typia.assert(response);

  // 4. Assert that success is true even for nonexistent emails, to prevent
  //    leaking account existence through control flow.
  TestValidator.equals(
    "password reset request should report success for nonexistent seller email",
    response.success,
    true,
  );

  // 5. Assert that message is a non-empty string (basic sanity check on the
  //    human-readable acknowledgment).
  TestValidator.predicate(
    "password reset request response message should be a non-empty string",
    typeof response.message === "string" && response.message.length > 0,
  );
}
