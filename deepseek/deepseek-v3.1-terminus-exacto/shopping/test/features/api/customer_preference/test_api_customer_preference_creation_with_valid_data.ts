import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallUserPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserPreference";

/**
 * Test successful creation of customer preference settings with valid
 * preference data.
 *
 * This E2E test validates the complete workflow for customer preference
 * management:
 *
 * 1. Customer registers a new account through authentication
 * 2. Customer creates a base preference setting using the general endpoint
 * 3. Customer creates a customer-specific preference using the customer-scoped
 *    endpoint
 * 4. Validates that preferences are properly associated with the customer account
 * 5. Ensures all system-generated fields (IDs, timestamps) are correctly populated
 */
export async function test_api_customer_preference_creation_with_valid_data(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for authentication context
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "TestPassword123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.example.com/register",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create base preference to verify customer scoping
  const basePreference =
    await api.functional.shoppingMall.customer.userPreferences.post(
      connection,
      {
        body: {
          preference_type: "notification",
          preference_key: "email_frequency",
          preference_value: "daily",
          category: "communication",
        } satisfies IShoppingMallUserPreference.ICreate,
      },
    );
  typia.assert(basePreference);
  TestValidator.equals(
    "base preference customer association",
    basePreference.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "base preference type matches",
    basePreference.preference_type,
    "notification",
  );
  TestValidator.equals(
    "base preference key matches",
    basePreference.preference_key,
    "email_frequency",
  );
  TestValidator.equals(
    "base preference value matches",
    basePreference.preference_value,
    "daily",
  );
  TestValidator.equals(
    "base preference category matches",
    basePreference.category,
    "communication",
  );
  TestValidator.predicate(
    "base preference is active",
    basePreference.is_active,
  );

  // Step 3: Create customer-specific preference with valid data
  const customerSpecificPreference =
    await api.functional.shoppingMall.customer.userPreferences.postByCustomerid(
      connection,
      {
        customerId: customer.id,
        body: {
          preference_type: "display",
          preference_key: "theme",
          preference_value: "dark",
          category: "appearance",
        } satisfies IShoppingMallUserPreference.ICreate,
      },
    );
  typia.assert(customerSpecificPreference);

  // Step 4: Validate preference creation results
  TestValidator.equals(
    "customer-specific preference customer association",
    customerSpecificPreference.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "preference type matches input",
    customerSpecificPreference.preference_type,
    "display",
  );
  TestValidator.equals(
    "preference key matches input",
    customerSpecificPreference.preference_key,
    "theme",
  );
  TestValidator.equals(
    "preference value matches input",
    customerSpecificPreference.preference_value,
    "dark",
  );
  TestValidator.equals(
    "category matches input",
    customerSpecificPreference.category,
    "appearance",
  );
  TestValidator.predicate(
    "preference is active by default",
    customerSpecificPreference.is_active,
  );

  // Step 5: Validate customer summary in preference response
  TestValidator.equals(
    "customer summary ID matches",
    customerSpecificPreference.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "customer summary email matches",
    customerSpecificPreference.customer.email,
    customer.email,
  );
  TestValidator.equals(
    "customer summary first name matches",
    customerSpecificPreference.customer.first_name,
    customer.first_name,
  );
  TestValidator.equals(
    "customer summary last name matches",
    customerSpecificPreference.customer.last_name,
    customer.last_name,
  );
  TestValidator.equals(
    "customer summary phone number matches",
    customerSpecificPreference.customer.phone_number,
    customer.phone_number,
  );
  TestValidator.equals(
    "customer summary status matches",
    customerSpecificPreference.customer.status,
    customer.status,
  );
}
