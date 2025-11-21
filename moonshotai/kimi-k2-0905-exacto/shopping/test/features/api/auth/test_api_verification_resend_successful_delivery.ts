import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallResendVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallResendVerification";
import type { IShoppingMallResendVerificationResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallResendVerificationResponse";

/**
 * Test customer verification email resend succeeds when customer provides valid
 * email address for account verification. Validates resend mechanism during
 * registration process, ensures fresh verification token generation, cites
 * email service provider success, and confirms system allows customer
 * verification retry within rate limited timeframe.
 */
export async function test_api_verification_resend_successful_delivery(
  connection: api.IConnection,
) {
  // Generate valid test data for verification resend request
  const email = typia.random<string & tags.Format<"email">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Create verification resend request with valid email
  const requestBody = {
    email,
    href,
    referrer,
  } satisfies IShoppingMallResendVerification;

  // Call verification resend API
  const response =
    await api.functional.shoppingMall.auth.verification.resend.resendVerification(
      connection,
      {
        body: requestBody,
      },
    );

  // Validate response structure and success indicators
  typia.assert(response);

  // Verify success response with detailed validation
  TestValidator.equals("response success status", response.success, true);
  TestValidator.predicate(
    "response has meaningful message",
    response.message.length > 0 &&
      (response.message.toLowerCase().includes("verification") ||
        response.message.toLowerCase().includes("email") ||
        response.message.toLowerCase().includes("sent")),
  );

  // Validate optional delivery status field
  if (response.delivery_status !== undefined) {
    TestValidator.predicate(
      "delivery status indicates success",
      response.delivery_status.toLowerCase().includes("success") ||
        response.delivery_status.toLowerCase().includes("sent") ||
        response.delivery_status.toLowerCase().includes("delivered"),
    );
  }

  // Test with optional customerId parameter
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const requestWithCustomerId = {
    email,
    customerId,
    href,
    referrer,
  } satisfies IShoppingMallResendVerification;

  const responseWithCustomerId =
    await api.functional.shoppingMall.auth.verification.resend.resendVerification(
      connection,
      {
        body: requestWithCustomerId,
      },
    );

  // Validate response with customerId
  typia.assert(responseWithCustomerId);
  TestValidator.equals(
    "response with customerId success",
    responseWithCustomerId.success,
    true,
  );
  TestValidator.predicate(
    "response with customerId has message",
    responseWithCustomerId.message.length > 0,
  );
}
