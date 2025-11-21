import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallEmailVerify } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailVerify";
import type { IShoppingMallEmailVerifyResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailVerifyResponse";

/**
 * Test successful email verification using a UUID-based verification token from
 * email links. This scenario validates the token-based verification method
 * where customers click verification links in their email containing a UUID
 * token. The test verifies that submitting a valid UUID token successfully
 * verifies the email address, activates the customer account, and returns
 * proper confirmation response with customerId and verification timestamp. This
 * ensures the one-click email verification workflow functions correctly and
 * provides a seamless user experience for email confirmation in the shopping
 * mall platform.
 */
export async function test_api_shopping_mall_email_verification_token_success(
  connection: api.IConnection,
) {
  // Generate a valid UUID-based verification token
  const verificationToken: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Create email verification request with token
  const emailVerifyRequest: IShoppingMallEmailVerify = {
    verification_token: verificationToken,
  };

  // Call email verification API with token-based verification
  const response: IShoppingMallEmailVerifyResponse =
    await api.functional.shoppingMall.auth.email_verify.verifyEmail(
      connection,
      {
        body: emailVerifyRequest,
      },
    );

  // Validate successful verification response
  typia.assert(response);

  // Verify success response structure
  TestValidator.predicate("success should be true", response.success === true);
  TestValidator.predicate(
    "customerId should be present on success",
    response.customerId !== null && response.customerId !== undefined,
  );
  TestValidator.predicate(
    "verifiedAt timestamp should be present",
    response.verifiedAt !== undefined,
  );
  TestValidator.predicate(
    "message should contain verification confirmation",
    response.message.length >= 10,
  );

  // Verify UUID format for customerId
  TestValidator.predicate(
    "customerId should be valid UUID format",
    typeof response.customerId === "string" &&
      response.customerId.length === 36,
  );

  // Verify ISO 8601 timestamp format
  TestValidator.predicate(
    "verifiedAt should be valid ISO 8601 timestamp",
    typeof response.verifiedAt === "string" &&
      response.verifiedAt!.includes("T"),
  );

  // Test the message content provides appropriate feedback
  TestValidator.predicate(
    "message length should be within valid range",
    response.message.length >= 10 && response.message.length <= 500,
  );
}
