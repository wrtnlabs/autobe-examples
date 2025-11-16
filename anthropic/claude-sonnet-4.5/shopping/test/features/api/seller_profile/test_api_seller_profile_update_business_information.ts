import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller business information update functionality.
 *
 * This test validates that sellers can successfully update their business
 * profile information including business_name, business_description, and
 * store_name through the seller profile update endpoint. It ensures that
 * authenticated sellers can maintain current and accurate business details in
 * their marketplace profile.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a new seller account
 * 2. Update the seller's business information with new values
 * 3. Validate that all updated fields are persisted correctly
 * 4. Verify the response reflects the updated business information
 */
export async function test_api_seller_profile_update_business_information(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a seller account
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile("+82"),
    business_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 7,
    }),
    business_description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
    }),
    store_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 6,
    }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.ICreate;

  const authenticatedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: registrationData,
    });
  typia.assert(authenticatedSeller);

  // Step 2: Prepare updated business information
  const updatedBusinessInfo = {
    business_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 8,
    }),
    business_description: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
    store_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 7,
    }),
  } satisfies IShoppingMallSeller.IUpdate;

  // Step 3: Update the seller's business information
  const updatedSeller: IShoppingMallSeller =
    await api.functional.shoppingMall.seller.sellers.update(connection, {
      sellerId: authenticatedSeller.id,
      body: updatedBusinessInfo,
    });
  typia.assert(updatedSeller);

  // Step 4: Validate that updated fields are persisted correctly
  TestValidator.equals(
    "business_name should be updated",
    updatedSeller.business_name,
    updatedBusinessInfo.business_name,
  );

  TestValidator.equals(
    "business_description should be updated",
    updatedSeller.business_description,
    updatedBusinessInfo.business_description,
  );

  TestValidator.equals(
    "store_name should be updated",
    updatedSeller.store_name,
    updatedBusinessInfo.store_name,
  );

  // Step 5: Verify that other fields remain unchanged
  TestValidator.equals(
    "seller ID should remain unchanged",
    updatedSeller.id,
    authenticatedSeller.id,
  );

  TestValidator.equals(
    "email should remain unchanged",
    updatedSeller.email,
    authenticatedSeller.email,
  );

  TestValidator.equals(
    "full_name should remain unchanged",
    updatedSeller.full_name,
    authenticatedSeller.full_name,
  );

  TestValidator.equals(
    "phone_number should remain unchanged",
    updatedSeller.phone_number,
    authenticatedSeller.phone_number,
  );
}
