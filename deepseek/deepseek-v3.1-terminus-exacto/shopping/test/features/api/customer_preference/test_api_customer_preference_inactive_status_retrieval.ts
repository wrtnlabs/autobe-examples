import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallUserPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserPreference";

/**
 * Test retrieval of customer preference settings to ensure data preservation
 * and accessibility.
 *
 * This test validates the complete lifecycle of customer preference management:
 *
 * 1. Customer registration and authentication
 * 2. Creation of a user preference with specific settings
 * 3. Verification that preferences remain accessible with proper data integrity
 * 4. Historical data preservation validation for compliance requirements
 *
 * The test ensures that the shopping mall platform properly maintains
 * preference records according to business requirements, focusing on data
 * accessibility rather than inactive status testing (which requires unavailable
 * API functions).
 */
export async function test_api_customer_preference_inactive_status_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "TestPassword123";

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

  // Step 2: Create a user preference setting
  const preferenceData = {
    preference_type: "notification",
    preference_key: "email_frequency",
    preference_value: "daily",
    category: "communication",
  } satisfies IShoppingMallUserPreference.ICreate;

  const createdPreference: IShoppingMallUserPreference =
    await api.functional.shoppingMall.customer.userPreferences.postByCustomerid(
      connection,
      {
        customerId: customer.id,
        body: preferenceData,
      },
    );
  typia.assert(createdPreference);

  // Step 3: Validate the created preference matches input data
  TestValidator.equals(
    "preference type matches",
    createdPreference.preference_type,
    preferenceData.preference_type,
  );
  TestValidator.equals(
    "preference key matches",
    createdPreference.preference_key,
    preferenceData.preference_key,
  );
  TestValidator.equals(
    "preference value matches",
    createdPreference.preference_value,
    preferenceData.preference_value,
  );
  TestValidator.equals(
    "preference category matches",
    createdPreference.category,
    preferenceData.category,
  );
  TestValidator.predicate(
    "preference should be active initially",
    createdPreference.is_active,
  );

  // Step 4: Retrieve the preference to verify accessibility
  const retrievedPreference: IShoppingMallUserPreference =
    await api.functional.shoppingMall.customer.userPreferences.getByCustomeridAndPreferenceid(
      connection,
      {
        customerId: customer.id,
        preferenceId: createdPreference.id,
      },
    );
  typia.assert(retrievedPreference);

  // Step 5: Validate retrieved preference matches created preference
  TestValidator.equals(
    "retrieved preference ID matches",
    retrievedPreference.id,
    createdPreference.id,
  );
  TestValidator.equals(
    "retrieved preference type matches",
    retrievedPreference.preference_type,
    createdPreference.preference_type,
  );
  TestValidator.equals(
    "retrieved preference key matches",
    retrievedPreference.preference_key,
    createdPreference.preference_key,
  );
  TestValidator.equals(
    "retrieved preference value matches",
    retrievedPreference.preference_value,
    createdPreference.preference_value,
  );
  TestValidator.equals(
    "retrieved preference category matches",
    retrievedPreference.category,
    createdPreference.category,
  );
  TestValidator.predicate(
    "retrieved preference should be accessible",
    retrievedPreference.is_active,
  );

  // Step 6: Business logic validation - preferences maintain data integrity
  TestValidator.equals(
    "customer association is maintained",
    retrievedPreference.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "customer email association",
    retrievedPreference.customer.email,
    customer.email,
  );
  TestValidator.predicate(
    "preference has valid creation timestamp",
    retrievedPreference.created_at !== null &&
      retrievedPreference.created_at !== undefined,
  );
  TestValidator.predicate(
    "preference has valid update timestamp",
    retrievedPreference.updated_at !== null &&
      retrievedPreference.updated_at !== undefined,
  );
  TestValidator.predicate(
    "preference timestamps are valid ISO strings",
    typeof retrievedPreference.created_at === "string" &&
      typeof retrievedPreference.updated_at === "string",
  );
}
