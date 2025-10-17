import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test the seller email verification resend workflow for unverified seller
 * accounts.
 *
 * This test validates that sellers who did not receive their original
 * verification email or whose token expired can request a new verification
 * link. The workflow consists of:
 *
 * 1. Create a new seller account through registration (generates initial
 *    verification token)
 * 2. Request a new verification email through the resend endpoint
 * 3. Validate that the system generates a new token and returns success
 *    confirmation
 *
 * The test ensures that the seller onboarding support flow works correctly for
 * email verification issues, allowing sellers to complete the email
 * verification step required before account approval and full platform access.
 */
export async function test_api_seller_verification_email_resend(
  connection: api.IConnection,
) {
  // Step 1: Create new seller account with initial email_verified=false
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const createData = {
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
    business_address: `${RandomGenerator.alphaNumeric(5)} ${RandomGenerator.name(1)} Street, ${RandomGenerator.name(1)} City`,
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const createdSeller = await api.functional.auth.seller.join(connection, {
    body: createData,
  });
  typia.assert(createdSeller);

  // Validate seller was created successfully
  TestValidator.equals(
    "seller email matches",
    createdSeller.email,
    sellerEmail,
  );
  TestValidator.equals(
    "business name matches",
    createdSeller.business_name,
    createData.business_name,
  );

  // Step 2: Request resend verification email
  const resendResponse =
    await api.functional.auth.seller.verification.resend.resendVerificationEmail(
      connection,
      {
        body: {
          email: sellerEmail,
        } satisfies IShoppingMallSeller.IResendVerificationRequest,
      },
    );
  typia.assert(resendResponse);

  // Step 3: Validate response contains success message
  TestValidator.predicate(
    "resend response has message",
    typeof resendResponse.message === "string" &&
      resendResponse.message.length > 0,
  );
}
