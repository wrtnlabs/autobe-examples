import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallEmailVerify } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailVerify";
import type { IShoppingMallEmailVerifyResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailVerifyResponse";

/**
 * Test successful email verification using a six-digit numeric verification
 * code.
 *
 * This scenario validates the complete email verification flow where a customer
 * receives a verification code via email and successfully confirms their email
 * address. The test should verify that entering a valid 6-digit code (matching
 * the pattern ^[0-9]{6}$) successfully activates the customer account, returns
 * a success response with customerId, and sets the proper verification
 * timestamp. This ensures the email verification system works correctly for
 * code-based verification method and properly activates customer accounts in
 * the shopping mall platform.
 *
 * 1. Generate a valid 6-digit verification code matching the pattern
 * 2. Call the email verification API with the generated code
 * 3. Validate the success response contains all required fields
 * 4. Verify the response indicates successful verification
 * 5. Confirm the response structure matches expected format
 * 6. Validate optional fields for successful verification are present
 */
export async function test_api_shopping_mall_email_verification_code_success(
  connection: api.IConnection,
) {
  // Generate a valid 6-digit verification code matching the pattern
  const verificationCode = ArrayUtil.repeat(6, (_) =>
    RandomGenerator.pick([..."0123456789"]),
  ).join("") satisfies string & tags.Pattern<"^[0-9]{6}$">;

  // Create the email verification request body
  const requestBody = {
    verification_code: verificationCode,
  } satisfies IShoppingMallEmailVerify;

  // Call the email verification API with the generated code
  const response =
    await api.functional.shoppingMall.auth.email_verify.verifyEmail(
      connection,
      {
        body: requestBody,
      },
    );

  // Validate the response structure
  typia.assert(response);

  // Validate the success response verification
  TestValidator.predicate(
    "verification should be successful",
    response.success !== null && response.success === true,
  );

  // Validate the message is present
  TestValidator.predicate(
    "response should contain message",
    response.message !== null && response.message !== undefined,
  );
  TestValidator.predicate(
    "message should have valid length",
    response.message.length >= 10 && response.message.length <= 500,
  );

  // Validate success-specific fields are present when verification succeeds
  TestValidator.predicate(
    "successful verification should have customerId",
    response.customerId !== null && response.customerId !== undefined,
  );
  TestValidator.predicate(
    "successful verification should have verification timestamp",
    response.verifiedAt !== null && response.verifiedAt !== undefined,
  );
}
