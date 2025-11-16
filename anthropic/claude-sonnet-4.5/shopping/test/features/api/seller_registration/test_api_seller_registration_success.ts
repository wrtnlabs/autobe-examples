import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test successful seller account registration with complete business
 * information.
 *
 * This test validates the complete seller registration workflow in the
 * e-commerce marketplace. It verifies that a new seller can successfully
 * register with all required business information and receive JWT
 * authentication tokens for immediate access to seller dashboard features.
 *
 * The test performs the following steps:
 *
 * 1. Generate valid seller registration data with business details
 * 2. Submit registration request to the API
 * 3. Validate successful response with complete seller profile
 * 4. Verify initial account status is "pending" approval
 * 5. Confirm email_verified is false (requires verification)
 * 6. Validate JWT tokens are present and properly structured
 * 7. Verify access token is automatically set in connection headers
 */
export async function test_api_seller_registration_success(
  connection: api.IConnection,
) {
  // Step 1: Generate valid seller registration data
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // Strong password 12 chars
    full_name: RandomGenerator.name(2), // Generate 2-word name
    phone_number: RandomGenerator.mobile("+82"), // Korean phone format
    business_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 8,
    }),
    business_description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 8,
    }),
    store_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 6,
    }),
    href: "https://marketplace.example.com/seller/register" satisfies string &
      tags.Format<"uri">,
    referrer: "https://marketplace.example.com/seller/info" satisfies string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSeller.ICreate;

  // Step 2: Submit seller registration request
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: registrationData,
    });

  // Step 3: Validate complete seller profile response - this validates ALL types perfectly
  typia.assert(seller);

  // Step 4: Verify seller account details match registration data
  TestValidator.equals(
    "seller email matches registration",
    seller.email,
    registrationData.email,
  );
  TestValidator.equals(
    "seller full_name matches",
    seller.full_name,
    registrationData.full_name,
  );
  TestValidator.equals(
    "seller phone_number matches",
    seller.phone_number,
    registrationData.phone_number,
  );
  TestValidator.equals(
    "seller business_name matches",
    seller.business_name,
    registrationData.business_name,
  );
  TestValidator.equals(
    "seller business_description matches",
    seller.business_description,
    registrationData.business_description,
  );
  TestValidator.equals(
    "seller store_name matches",
    seller.store_name,
    registrationData.store_name,
  );

  // Step 5: Verify initial account status (business logic validation)
  TestValidator.equals(
    "seller status is pending approval",
    seller.status,
    "pending",
  );
  TestValidator.equals(
    "email is not yet verified",
    seller.email_verified,
    false,
  );

  // Step 6: Verify deleted_at is null for new account
  TestValidator.equals(
    "deleted_at is null for new account",
    seller.deleted_at,
    null,
  );

  // Step 7: Verify access token is automatically set in connection headers
  TestValidator.equals(
    "access token automatically set in headers",
    connection.headers?.Authorization,
    seller.token.access,
  );
}
