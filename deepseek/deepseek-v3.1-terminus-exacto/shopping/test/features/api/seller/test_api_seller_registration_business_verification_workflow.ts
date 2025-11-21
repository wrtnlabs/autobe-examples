import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller registration workflow including business verification status
 * transitions. Validates that newly registered sellers start with appropriate
 * status (pending_approval) and that business verification processes are
 * properly initiated upon successful registration.
 */
export async function test_api_seller_registration_business_verification_workflow(
  connection: api.IConnection,
) {
  // Generate realistic seller registration data
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "SecurePassword123!";
  const businessName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const contactPerson = RandomGenerator.name();
  const phoneNumber = RandomGenerator.mobile("010");
  const businessAddress = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 8,
  });
  const taxId = RandomGenerator.alphaNumeric(10);
  const currentUrl = "https://shopping-mall.example.com/seller/registration";
  const referrerUrl = "https://shopping-mall.example.com/seller/signup";

  // Create seller registration request body
  const registrationBody = {
    email: sellerEmail,
    password: sellerPassword,
    business_name: businessName,
    contact_person: contactPerson,
    phone_number: phoneNumber,
    business_address: businessAddress,
    tax_id: taxId,
    href: currentUrl,
    referrer: referrerUrl,
  } satisfies IShoppingMallSeller.ICreate;

  // Execute seller registration
  const registeredSeller = await api.functional.auth.seller.join(connection, {
    body: registrationBody,
  });

  // Validate response structure and type safety
  typia.assert(registeredSeller);

  // Verify seller account information matches registration data
  TestValidator.equals(
    "seller email should match registration input",
    registeredSeller.email,
    sellerEmail,
  );
  TestValidator.equals(
    "business name should match registration input",
    registeredSeller.business_name,
    businessName,
  );
  TestValidator.equals(
    "contact person should match registration input",
    registeredSeller.contact_person,
    contactPerson,
  );
  TestValidator.equals(
    "phone number should match registration input",
    registeredSeller.phone_number,
    phoneNumber,
  );
  TestValidator.equals(
    "business address should match registration input",
    registeredSeller.business_address,
    businessAddress,
  );

  // Validate seller status is set to pending_approval for business verification
  TestValidator.equals(
    "new seller status should be pending_approval",
    registeredSeller.status,
    "pending_approval",
  );

  // Validate authentication token structure
  typia.assert<IAuthorizationToken>(registeredSeller.token);
  TestValidator.predicate(
    "access token should be present and non-empty",
    registeredSeller.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be present and non-empty",
    registeredSeller.token.refresh.length > 0,
  );

  // Validate token expiration dates are in the future
  const tokenExpiration = new Date(registeredSeller.token.expired_at);
  const refreshExpiration = new Date(registeredSeller.token.refreshable_until);
  TestValidator.predicate(
    "token expiration should be in the future",
    tokenExpiration > new Date(),
  );
  TestValidator.predicate(
    "refreshable until should be in the future",
    refreshExpiration > new Date(),
  );

  // Validate that refreshable until is later than token expiration
  TestValidator.predicate(
    "refreshable until should be after token expiration",
    refreshExpiration > tokenExpiration,
  );
}
