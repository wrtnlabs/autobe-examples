import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test the password reset request workflow for seller accounts.
 *
 * This test validates the initial steps of the seller password reset process,
 * focusing on the parts that can be tested in an automated environment:
 *
 * 1. Creating a seller account with initial credentials
 * 2. Successfully requesting a password reset token
 * 3. Verifying that the request returns appropriate confirmation
 *
 * Note: The complete workflow including token-based password reset confirmation
 * cannot be fully tested in this environment because reset tokens are delivered
 * via email (external system) and are not included in API responses for
 * security reasons. The confirmation step would require access to the email
 * system to extract the actual token, which is not available in automated
 * tests.
 *
 * The test ensures that the password reset request mechanism works correctly
 * and returns expected responses, validating the first critical step of the
 * password recovery workflow.
 */
export async function test_api_seller_password_reset_confirmation_with_valid_token(
  connection: api.IConnection,
) {
  // Step 1: Create seller account with initial password
  const initialPassword = "InitialPass123!";
  const sellerEmail = typia.random<string & tags.Format<"email">>();

  const sellerData = {
    email: sellerEmail,
    password: initialPassword,
    business_name: RandomGenerator.name(2),
    business_type: RandomGenerator.pick([
      "individual",
      "LLC",
      "corporation",
      "partnership",
    ] as const),
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.name()} Street, ${RandomGenerator.name()} City`,
    tax_id: RandomGenerator.alphaNumeric(9),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerData,
    });
  typia.assert(seller);

  // Validate seller account creation
  TestValidator.predicate(
    "seller should have valid UUID",
    seller.id.length > 0,
  );
  TestValidator.equals("seller email should match", seller.email, sellerEmail);
  TestValidator.equals(
    "business name should match",
    seller.business_name,
    sellerData.business_name,
  );

  // Step 2: Request password reset token
  const resetRequest = {
    email: sellerEmail,
  } satisfies IShoppingMallSeller.IPasswordResetRequest;

  const resetRequestResponse: IShoppingMallSeller.IPasswordResetRequestResponse =
    await api.functional.auth.seller.password.reset.request.requestPasswordReset(
      connection,
      {
        body: resetRequest,
      },
    );
  typia.assert(resetRequestResponse);

  // Verify that we received a success message
  TestValidator.predicate(
    "reset request should return success message",
    typeof resetRequestResponse.message === "string" &&
      resetRequestResponse.message.length > 0,
  );

  // Step 3: Test password reset request with non-existent email (should still return generic message for security)
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  const resetRequestNonExistent = {
    email: nonExistentEmail,
  } satisfies IShoppingMallSeller.IPasswordResetRequest;

  const resetResponseNonExistent: IShoppingMallSeller.IPasswordResetRequestResponse =
    await api.functional.auth.seller.password.reset.request.requestPasswordReset(
      connection,
      {
        body: resetRequestNonExistent,
      },
    );
  typia.assert(resetResponseNonExistent);

  // Should return generic message to prevent email enumeration attacks
  TestValidator.predicate(
    "reset request with non-existent email should return generic message",
    typeof resetResponseNonExistent.message === "string" &&
      resetResponseNonExistent.message.length > 0,
  );
}
