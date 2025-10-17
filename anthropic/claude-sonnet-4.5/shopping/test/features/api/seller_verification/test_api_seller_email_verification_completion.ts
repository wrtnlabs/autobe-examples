import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller email verification error handling.
 *
 * NOTE: This test validates error handling for the email verification endpoint
 * because the actual email_verification_token generated during registration is
 * not exposed in the API response (IShoppingMallSeller.IAuthorized). In a real
 * scenario, the token would be sent via email and extracted from the
 * verification link by the seller.
 *
 * This test validates:
 *
 * 1. Seller registration successfully creates an account
 * 2. The verification endpoint properly rejects invalid/non-existent tokens
 * 3. Error handling works correctly for token validation failures
 *
 * For complete email verification testing, the verification token would need to
 * be extracted from the email system or backend database directly.
 */
export async function test_api_seller_email_verification_completion(
  connection: api.IConnection,
) {
  // Step 1: Create new seller account through registration
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(),
    business_type: RandomGenerator.pick([
      "individual",
      "LLC",
      "corporation",
      "partnership",
    ] as const),
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<9999>>()} ${RandomGenerator.name()} Street, ${RandomGenerator.name()} City`,
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const registeredSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: registrationData,
    });
  typia.assert(registeredSeller);

  // Step 2: Test verification endpoint error handling with invalid token
  // The actual verification token is generated on the backend and sent via email,
  // so we test that the endpoint properly rejects invalid tokens
  await TestValidator.error("invalid token should be rejected", async () => {
    await api.functional.auth.seller.verification.confirm.verifyEmail(
      connection,
      {
        body: {
          token: RandomGenerator.alphaNumeric(32),
        } satisfies IShoppingMallSeller.IVerifyEmail,
      },
    );
  });
}
