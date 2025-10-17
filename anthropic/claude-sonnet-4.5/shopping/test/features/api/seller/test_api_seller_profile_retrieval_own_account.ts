import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller profile retrieval for own account.
 *
 * This test validates that an authenticated seller can successfully retrieve
 * their own account details from the shopping_mall_sellers table. It ensures
 * that sellers have proper access to view their complete business profile
 * including business information, verification status, store customization, and
 * account details.
 *
 * Workflow:
 *
 * 1. Register a new seller account with complete business information
 * 2. Retrieve the seller's own profile using the authenticated connection
 * 3. Validate that the retrieved profile matches the registration data
 */
export async function test_api_seller_profile_retrieval_own_account(
  connection: api.IConnection,
) {
  // Step 1: Register new seller account
  const registrationEmail = typia.random<string & tags.Format<"email">>();
  const businessName = RandomGenerator.name(2);
  const contactPersonName = RandomGenerator.name();

  const registrationData = {
    email: registrationEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: businessName,
    business_type: RandomGenerator.pick([
      "individual",
      "LLC",
      "corporation",
      "partnership",
    ] as const),
    contact_person_name: contactPersonName,
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 8,
    }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const authorizedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: registrationData,
    });
  typia.assert(authorizedSeller);

  // Step 2: Retrieve seller's own profile
  const retrievedProfile: IShoppingMallSeller =
    await api.functional.shoppingMall.seller.sellers.at(connection, {
      sellerId: authorizedSeller.id,
    });
  typia.assert(retrievedProfile);

  // Step 3: Validate retrieved profile matches registration data
  TestValidator.equals(
    "seller ID matches",
    retrievedProfile.id,
    authorizedSeller.id,
  );
  TestValidator.equals(
    "email matches",
    retrievedProfile.email,
    registrationEmail,
  );
  TestValidator.equals(
    "business name matches",
    retrievedProfile.business_name,
    businessName,
  );
  TestValidator.equals(
    "contact person name matches",
    retrievedProfile.contact_person_name,
    contactPersonName,
  );
}
