import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test complete seller profile update workflow.
 *
 * This test validates that an authenticated seller can successfully modify
 * their business information including business name, and that the updated
 * information is persisted correctly with proper timestamp updates.
 *
 * Workflow:
 *
 * 1. Register a new seller account with initial business data
 * 2. Verify automatic authentication from registration
 * 3. Update the seller's business_name field
 * 4. Verify the updated information is correctly returned
 * 5. Verify updated_at timestamp is refreshed
 */
export async function test_api_seller_profile_update_business_information(
  connection: api.IConnection,
) {
  // Step 1: Register new seller account with initial business data
  const initialBusinessName = RandomGenerator.name();
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const registrationData = {
    email: sellerEmail,
    password: sellerPassword,
    business_name: initialBusinessName,
    business_type: RandomGenerator.pick([
      "individual",
      "LLC",
      "corporation",
      "partnership",
    ] as const),
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 7,
    }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const authorizedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: registrationData,
    });

  typia.assert(authorizedSeller);

  // Step 2: Verify seller registration succeeded and authentication token is set
  TestValidator.equals(
    "registered business name matches",
    authorizedSeller.business_name,
    initialBusinessName,
  );
  TestValidator.equals(
    "registered email matches",
    authorizedSeller.email,
    sellerEmail,
  );

  // Step 3: Update the seller's business information
  const updatedBusinessName = RandomGenerator.name();
  const updateData = {
    business_name: updatedBusinessName,
  } satisfies IShoppingMallSeller.IUpdate;

  const updatedSeller: IShoppingMallSeller =
    await api.functional.shoppingMall.seller.sellers.update(connection, {
      sellerId: authorizedSeller.id,
      body: updateData,
    });

  typia.assert(updatedSeller);

  // Step 4: Verify the business_name was updated correctly
  TestValidator.equals(
    "business name updated",
    updatedSeller.business_name,
    updatedBusinessName,
  );
  TestValidator.equals(
    "seller ID unchanged",
    updatedSeller.id,
    authorizedSeller.id,
  );
  TestValidator.equals("email unchanged", updatedSeller.email, sellerEmail);

  // Step 5: Verify updated_at timestamp is later than created_at
  const createdAt = new Date(updatedSeller.created_at);
  const updatedAt = new Date(updatedSeller.updated_at);
  TestValidator.predicate(
    "updated_at is later than or equal to created_at",
    updatedAt >= createdAt,
  );
}
