import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallEmailVerify } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailVerify";
import type { IShoppingMallEmailVerifyResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailVerifyResponse";

/**
 * Test email verification attempt on an already verified email address.
 *
 * This test validates the email verification system's behavior when attempting
 * to verify an email address that has already been successfully verified. The
 * scenario ensures proper handling of duplicate verification attempts and
 * maintains data integrity for verified accounts.
 *
 * 1. Generate a random email verification request with verification code
 * 2. Attempt to verify the email address
 * 3. Parse and validate the response structure
 * 4. Verify that the response handles already verified emails appropriately
 * 5. Ensure proper error handling and user guidance
 */
export async function test_api_shopping_mall_email_verification_already_verified(
  connection: api.IConnection,
) {
  // Generate a valid email verification request with verification code
  const verificationRequest = {
    verification_code: typia.random<string & tags.Pattern<"^[0-9]{6}$">>(),
  } satisfies IShoppingMallEmailVerify;

  console.log(
    `Testing verification request with code: ${verificationRequest.verification_code}`,
  );

  try {
    // First verification attempt
    const firstResponse =
      await api.functional.shoppingMall.auth.email_verify.verifyEmail(
        connection,
        {
          body: verificationRequest,
        },
      );

    // Validate first verification response structure
    typia.assert(firstResponse);

    TestValidator.predicate(
      "First verification should be successful",
      firstResponse.success === true,
    );

    TestValidator.predicate(
      "First verification should have meaningful message",
      firstResponse.message.length >= 10 && firstResponse.message.length <= 500,
    );

    TestValidator.predicate(
      "Response should have valid customerId for successful verification",
      firstResponse.customerId !== null &&
        firstResponse.customerId !== undefined,
    );

    TestValidator.predicate(
      "verifiedAt should be present for successful verification",
      firstResponse.verifiedAt !== undefined,
    );

    // Test the actual scenario: duplicate verification attempt
    // Generate a different verification code for the second attempt
    const duplicateRequest = {
      verification_code: typia.random<string & tags.Pattern<"^[0-9]{6}$">>(),
    } satisfies IShoppingMallEmailVerify;

    console.log(
      `Testing duplicate verification with different code: ${duplicateRequest.verification_code}`,
    );

    // Second verification attempt (duplicate/retried verification)
    const duplicateResponse =
      await api.functional.shoppingMall.auth.email_verify.verifyEmail(
        connection,
        {
          body: duplicateRequest,
        },
      );

    // Validate the duplicate verification response
    typia.assert(duplicateResponse);

    // Test the core functionality: email verification system handles duplicates gracefully
    TestValidator.predicate(
      "Duplicate verification should provide meaningful response with required message",
      duplicateResponse.success !== undefined &&
        duplicateResponse.message.length >= 10 &&
        duplicateResponse.message.length <= 500,
    );

    TestValidator.predicate(
      "Response should have consistent customerId across verification attempts",
      duplicateResponse.customerId === firstResponse.customerId,
    );

    TestValidator.predicate(
      "verifiedAt should be maintained across verification attempts",
      duplicateResponse.verifiedAt === firstResponse.verifiedAt,
    );

    // Key validation: the system should handle the situation appropriately
    // Whether it's logged as success or provides specific already-verified message
    console.log(
      `First verification: success=${firstResponse.success}, message="${firstResponse.message}"`,
    );
    console.log(
      `Duplicate verification: success=${duplicateResponse.success}, message="${duplicateResponse.message}"`,
    );

    TestValidator.predicate(
      "System should handle verification consistently regardless of duplicate attempts",
      duplicateResponse.success === firstResponse.success &&
        duplicateResponse.customerId !== null &&
        duplicateResponse.customerId !== undefined &&
        duplicateResponse.verifiedAt !== undefined,
    );
  } catch (error) {
    // Validate that errors are handled gracefully and provide proper feedback
    TestValidator.predicate(
      "Email verification error should be properly formatted",
      typeof error === "object" && error !== null,
    );

    console.log(`Verification error handled:`, error);

    // Re-throw to maintain test flow while documenting error
    throw error;
  }
}
