import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller account creation and password reset request workflow.
 *
 * This test validates the initial steps of the password reset process:
 *
 * 1. Creates a seller account with valid credentials
 * 2. Requests a password reset token for the account
 * 3. Verifies the reset request returns success confirmation
 *
 * Note: Testing password complexity validation during reset confirmation is not
 * possible in this E2E test environment because:
 *
 * - The reset token is sent via email and not returned by the API
 * - There is no test endpoint to retrieve the token
 * - Password complexity validation requires a valid token from the email
 *
 * To fully test password complexity requirements, additional test
 * infrastructure would be needed (e.g., email mock service, test token
 * generation endpoint, or database access for token retrieval).
 */
export async function test_api_seller_password_reset_with_invalid_password_complexity(
  connection: api.IConnection,
) {
  // Step 1: Create a seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = "ValidPass123!";

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: originalPassword,
      business_name: RandomGenerator.name(2),
      business_type: RandomGenerator.pick([
        "individual",
        "LLC",
        "corporation",
        "partnership",
      ] as const),
      contact_person_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_address: `${typia.random<number & tags.Type<"uint32"> & tags.Maximum<9999>>()} ${RandomGenerator.name(1)} Street`,
      tax_id: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Verify seller was created with expected properties
  TestValidator.equals("seller email matches", seller.email, sellerEmail);
  typia.assertGuard(seller.id);
  typia.assertGuard(seller.business_name);
  typia.assertGuard(seller.token);

  // Step 2: Request password reset token
  const resetRequest =
    await api.functional.auth.seller.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: sellerEmail,
        } satisfies IShoppingMallSeller.IPasswordResetRequest,
      },
    );
  typia.assert(resetRequest);

  // Verify reset request returned success message
  typia.assertGuard(resetRequest.message);
  TestValidator.predicate(
    "reset request message should be present",
    resetRequest.message.length > 0,
  );
}
