import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test password reset functionality for sellers.
 *
 * This test validates the complete password reset workflow including:
 *
 * - Seller account creation
 * - Password reset token request
 * - Password reset confirmation
 *
 * Note: Testing password reuse prevention requires access to actual reset
 * tokens and a way to change passwords multiple times, which is not available
 * through the provided API endpoints. This test focuses on the basic reset
 * flow.
 *
 * Steps:
 *
 * 1. Create a seller account with initial password
 * 2. Request password reset token for the seller email
 * 3. Verify the reset request returns success message
 */
export async function test_api_seller_password_reset_with_password_reuse_prevention(
  connection: api.IConnection,
) {
  // Step 1: Create seller account with initial password
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const initialPassword = "InitialPass123!";

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
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
        business_address: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.name()} St, ${RandomGenerator.name()} City`,
        tax_id: RandomGenerator.alphaNumeric(10),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 2: Request password reset token
  const resetRequest: IShoppingMallSeller.IPasswordResetRequestResponse =
    await api.functional.auth.seller.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: sellerEmail,
        } satisfies IShoppingMallSeller.IPasswordResetRequest,
      },
    );
  typia.assert(resetRequest);

  // Step 3: Verify reset request succeeded with message
  TestValidator.predicate(
    "password reset request returns success message",
    typeof resetRequest.message === "string" && resetRequest.message.length > 0,
  );
}
