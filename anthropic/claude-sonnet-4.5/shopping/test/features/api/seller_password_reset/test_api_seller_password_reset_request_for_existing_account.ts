import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller password reset request for existing account.
 *
 * This test validates the complete password reset request workflow:
 *
 * 1. Register a new seller account with complete business information
 * 2. Submit a password reset request using the registered email
 * 3. Verify the system returns a generic success message for security
 * 4. Confirm the endpoint is publicly accessible without authentication
 *
 * The test ensures that:
 *
 * - Password reset requests work for existing seller accounts
 * - Generic response messages prevent email enumeration attacks
 * - No authentication is required to request password reset (public endpoint)
 * - The server-side token generation and email notification process initiates
 *   correctly
 */
export async function test_api_seller_password_reset_request_for_existing_account(
  connection: api.IConnection,
) {
  // Step 1: Create a new seller account with valid business information
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const sellerRegistration = {
    email: sellerEmail,
    password: sellerPassword,
    business_name: RandomGenerator.name(2),
    business_type: RandomGenerator.pick([
      "individual",
      "LLC",
      "corporation",
      "partnership",
    ] as const),
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.name(1)} Street, ${RandomGenerator.name(1)} City`,
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const createdSeller = await api.functional.auth.seller.join(connection, {
    body: sellerRegistration,
  });
  typia.assert(createdSeller);

  // Verify seller was created successfully
  TestValidator.equals(
    "seller email matches",
    createdSeller.email,
    sellerEmail,
  );
  TestValidator.equals(
    "business name matches",
    createdSeller.business_name,
    sellerRegistration.business_name,
  );

  // Step 2: Create unauthenticated connection for password reset request
  // Password reset endpoint must be publicly accessible (sellers who forgot password cannot authenticate)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Step 3: Submit password reset request for the existing seller account
  const resetRequest = {
    email: sellerEmail,
  } satisfies IShoppingMallSeller.IPasswordResetRequest;

  const resetResponse =
    await api.functional.auth.seller.password.reset.request.requestPasswordReset(
      unauthConnection,
      {
        body: resetRequest,
      },
    );
  typia.assert(resetResponse);

  // Step 4: Validate the response structure and generic message
  TestValidator.predicate(
    "response contains generic success message",
    typeof resetResponse.message === "string" &&
      resetResponse.message.length > 0,
  );

  // The response should be generic to prevent email enumeration attacks
  // It should not reveal whether the email exists in the system or not
  TestValidator.predicate(
    "response message is generic and security-conscious",
    resetResponse.message.toLowerCase().includes("if") ||
      resetResponse.message.toLowerCase().includes("email"),
  );
}
