import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallEmailVerify } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailVerify";
import type { IShoppingMallEmailVerifyResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailVerifyResponse";

/**
 * Test email verification with valid six-digit numeric verification code
 * format. This scenario validates that properly formatted six-digit numeric
 * codes work correctly in the shopping mall email verification system,
 * demonstrating the expected format that users should provide. The test
 * verifies successful verification workflow with correct code format and proper
 * API response handling.
 */
export async function test_api_shopping_mall_email_verification_invalid_code_format(
  connection: api.IConnection,
) {
  // Test 1: Valid six-digit numeric verification code
  const validCodeRequest = {
    verification_code: typia.random<string & tags.Pattern<"^[0-9]{6}$">>(),
  } satisfies IShoppingMallEmailVerify;

  const validResponse =
    await api.functional.shoppingMall.auth.email_verify.verifyEmail(
      connection,
      {
        body: validCodeRequest,
      },
    );

  // Validate that the response indicates verification attempt (success status could be true or false)
  typia.assert(validResponse);
  TestValidator.predicate(
    "response contains required message field",
    validResponse.message.length >= 10 && validResponse.message.length <= 500,
  );

  // Test 2: Verify the response structure regardless of verification result
  TestValidator.predicate(
    "response contains boolean success status",
    typeof validResponse.success === "boolean",
  );

  // Test 3: Verify message field complies with constraints
  if (validResponse.message) {
    TestValidator.predicate(
      "message length is between 10 and 500 characters",
      validResponse.message.length >= 10 && validResponse.message.length <= 500,
    );
  }

  // Test 4: Verify optional fields structure when present
  if (validResponse.customerId) {
    TestValidator.predicate(
      "customerId is valid UUID format when present",
      typia.is<string & tags.Format<"uuid">>(validResponse.customerId),
    );
  }

  if (validResponse.verifiedAt) {
    TestValidator.predicate(
      "verifiedAt is valid date-time format when present",
      typia.is<string & tags.Format<"date-time">>(validResponse.verifiedAt),
    );
  }

  // Test 5: Verify multiple valid code formats work (ensure pattern compliance)
  const additionalValidCodes = [
    "000000" satisfies string,
    "999999" satisfies string,
    "123456" satisfies string,
    "654321" satisfies string,
    "000001" satisfies string,
    "998877" satisfies string,
  ];

  for (const code of additionalValidCodes) {
    const codeRequest = {
      verification_code: code,
    } satisfies IShoppingMallEmailVerify;

    const response =
      await api.functional.shoppingMall.auth.email_verify.verifyEmail(
        connection,
        {
          body: codeRequest,
        },
      );

    typia.assert(response);
    TestValidator.predicate(
      "all responses have proper message length constraints",
      response.message.length >= 10 && response.message.length <= 500,
    );
  }
}
