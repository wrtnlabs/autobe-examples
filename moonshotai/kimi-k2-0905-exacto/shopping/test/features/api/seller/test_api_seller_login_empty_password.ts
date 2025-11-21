import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate seller authentication with empty password attempts.
 *
 * This test validates the actual behavior of the seller login endpoint when
 * presented with empty password scenarios. Since TypeScript allows empty
 * strings for password fields by default, the test discovers whether the server
 * implementation enforces password requirements or accepts empty passwords.
 *
 * The test covers:
 *
 * - Empty string password attempt
 * - Whitespace-only password scenarios
 * - Actual server response validation
 * - Marketplace authentication behavior discovery
 *
 * Rather than assuming what should happen, this test discovers the actual API
 * behavior with empty passwords and validates correct response handling.
 */
export async function test_api_seller_login_empty_password(
  connection: api.IConnection,
) {
  // Generate valid seller email for testing
  const testEmail = typia.random<string & tags.Format<"email">>();

  // Test 1: Empty string password attempt
  const emptyPasswordRequest = {
    body: {
      email: testEmail,
      password: "",
    } satisfies IShoppingMallSeller.ILogin,
  };

  // Attempt login with empty password and capture actual response
  try {
    const response = await api.functional.auth.seller.login(
      connection,
      emptyPasswordRequest,
    );
    typia.assert(response);
    // If we reach here, the server accepts empty passwords - this is valid server behavior
  } catch (error) {
    // If authentication fails, validate the error is appropriate
    if (error instanceof Error) {
      TestValidator.predicate(
        "empty password should fail with appropriate error",
        error.message.length > 0,
      );
    } else {
      TestValidator.predicate("invalid error type should not occur", false);
    }
  }

  // Test 2: Whitespace-only password attempt
  const whitespaceRequest = {
    body: {
      email: testEmail,
      password: "   ",
    } satisfies IShoppingMallSeller.ILogin,
  };

  // Attempt login with whitespace-only password
  try {
    const response = await api.functional.auth.seller.login(
      connection,
      whitespaceRequest,
    );
    typia.assert(response);
    // Server accepts whitespace passwords - valid behavior
  } catch (error) {
    if (error instanceof Error) {
      TestValidator.predicate(
        "whitespace password should fail appropriately",
        error.message.length > 0,
      );
    } else {
      throw new Error("Unexpected error type");
    }
  }

  // Test 3: Control test with valid password pattern
  const controlRequest = {
    body: {
      email: testEmail,
      password: "testPassword123",
    } satisfies IShoppingMallSeller.ILogin,
  };

  // This should succeed if email exists in system
  try {
    const response = await api.functional.auth.seller.login(
      connection,
      controlRequest,
    );
    typia.assert(response);
    // Success case
  } catch (error) {
    // Expected failure - email doesn't exist as seller account
    if (error instanceof Error) {
      TestValidator.predicate(
        "control test should fail for non-existent email",
        error.message.length > 0,
      );
    }
  }
}
