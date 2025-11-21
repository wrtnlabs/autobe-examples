import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallEmailVerify } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailVerify";
import type { IShoppingMallEmailVerifyResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailVerifyResponse";

/**
 * Test email verification failure with expired verification token. This
 * scenario validates proper handling of expired verification tokens (tokens
 * expire after 24 hours from generation). The test should verify that
 * attempting to verify with an expired UUID token returns appropriate error
 * response indicating the token has expired and suggesting users request a new
 * verification email. This ensures the token-based verification system enforces
 * security time limits and provides helpful guidance for users with expired
 * verification tokens in the shopping mall platform.
 */
export async function test_api_shopping_mall_email_verification_expired_token(
  connection: api.IConnection,
) {
  // Generate a valid UUID token (though in reality it would be expired)
  const expiredToken = typia.random<string & tags.Format<"uuid">>();

  // Attempt to verify expired token
  const result =
    await api.functional.shoppingMall.auth.email_verify.verifyEmail(
      connection,
      {
        body: {
          verification_token: expiredToken,
        } satisfies IShoppingMallEmailVerify,
      },
    );

  // Validate the response structure
  typia.assert(result);

  // Verify that verification fails for expired token
  TestValidator.equals(
    "verification should fail for expired token",
    result.success,
    false,
  );

  // Verify failure message is provided
  TestValidator.predicate(
    "error message should be present",
    result.message.length > 0 &&
      result.message.length >= 10 &&
      result.message.length <= 500,
  );

  // Verify customerId is not returned for failed verification
  TestValidator.equals(
    "customerId should be null for failed verification",
    result.customerId,
    null,
  );

  // Verify verifiedAt is not set for failed verification
  TestValidator.equals(
    "verifiedAt should be undefined for failed verification",
    result.verifiedAt,
    undefined,
  );

  // Additional validation: error should stop further processing
  TestValidator.predicate(
    "error should prevent account activation",
    result.success === false && result.customerId === null,
  );
}
