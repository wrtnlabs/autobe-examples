import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallUserPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserPreference";

/**
 * Test successful retrieval of a specific customer preference by its unique
 * identifier.
 *
 * This E2E test validates the complete preference management workflow:
 *
 * 1. Customer authentication through account creation
 * 2. Creation of a preference record with specific type, key, and value
 *    combinations
 * 3. Retrieval of the preference using its generated ID
 * 4. Comprehensive validation of all preference details including type, key,
 *    value, category, active status, creation timestamp, and customer
 *    association
 */
export async function test_api_customer_user_preference_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "testPassword123";

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        phone_number: RandomGenerator.mobile(),
        href: "https://shoppingmall.example.com/register",
        referrer: "https://shoppingmall.example.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // Step 2: Create a preference record
  const preferenceData = {
    preference_type: "notification",
    preference_key: "email_frequency",
    preference_value: "daily",
    category: "communication",
  } satisfies IShoppingMallUserPreference.ICreate;

  const createdPreference: IShoppingMallUserPreference =
    await api.functional.shoppingMall.customer.userPreferences.post(
      connection,
      {
        body: preferenceData,
      },
    );
  typia.assert(createdPreference);

  // Step 3: Retrieve the preference by ID
  const retrievedPreference: IShoppingMallUserPreference =
    await api.functional.shoppingMall.customer.userPreferences.getByPreferenceid(
      connection,
      {
        preferenceId: createdPreference.id,
      },
    );
  typia.assert(retrievedPreference);

  // Step 4: Validate retrieved preference matches created preference
  TestValidator.equals(
    "preference ID matches",
    retrievedPreference.id,
    createdPreference.id,
  );
  TestValidator.equals(
    "preference type matches",
    retrievedPreference.preference_type,
    preferenceData.preference_type,
  );
  TestValidator.equals(
    "preference key matches",
    retrievedPreference.preference_key,
    preferenceData.preference_key,
  );
  TestValidator.equals(
    "preference value matches",
    retrievedPreference.preference_value,
    preferenceData.preference_value,
  );
  TestValidator.equals(
    "preference category matches",
    retrievedPreference.category,
    preferenceData.category,
  );

  // Validate active status
  TestValidator.predicate(
    "preference is active",
    retrievedPreference.is_active === true,
  );

  // Validate timestamps (no null checks needed as they are required fields)
  TestValidator.predicate(
    "created_at timestamp exists",
    retrievedPreference.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    retrievedPreference.updated_at.length > 0,
  );

  // Validate customer association
  TestValidator.equals(
    "customer ID matches",
    retrievedPreference.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "customer email matches",
    retrievedPreference.customer.email,
    customer.email,
  );
  TestValidator.equals(
    "customer first name matches",
    retrievedPreference.customer.first_name,
    customer.first_name,
  );
  TestValidator.equals(
    "customer last name matches",
    retrievedPreference.customer.last_name,
    customer.last_name,
  );
}
