import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallUserPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserPreference";

/**
 * Test successful creation of customer preference settings for personalized
 * user experience.
 *
 * This E2E test validates the complete workflow of customer preference
 * creation:
 *
 * 1. Customer registers a new account through authentication
 * 2. Authenticated customer creates a preference setting for notification
 *    frequency
 * 3. Validates that preference type, key, and value are properly stored
 * 4. Ensures preference is associated with the authenticated customer account
 * 5. Confirms preference becomes immediately active with proper timestamps
 */
export async function test_api_customer_preference_creation(
  connection: api.IConnection,
) {
  // Step 1: Create a new customer account for authentication context
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "TestPassword123";

  const customer = await api.functional.auth.customer.join(connection, {
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

  // Validate customer authentication was successful
  TestValidator.predicate(
    "customer authentication token received",
    customer.token.access.length > 0,
  );
  TestValidator.predicate(
    "customer authentication token expiration set",
    customer.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "customer account is active",
    customer.status === "active" || customer.status === "pending_verification",
  );

  // Step 2: Create a preference setting for the authenticated customer
  const preferenceTypes = [
    "notification",
    "display",
    "privacy",
    "shopping",
  ] as const;
  const preferenceKeys = [
    "email_frequency",
    "theme",
    "data_sharing",
    "auto_save_cart",
  ] as const;
  const preferenceValues = ["immediate", "daily", "weekly", "never"] as const;

  const preferenceData = {
    preference_type: RandomGenerator.pick(preferenceTypes),
    preference_key: RandomGenerator.pick(preferenceKeys),
    preference_value: RandomGenerator.pick(preferenceValues),
    category: RandomGenerator.pick([
      "communication",
      "appearance",
      "privacy",
      "behavior",
    ] as const),
  } satisfies IShoppingMallUserPreference.ICreate;

  const preference =
    await api.functional.shoppingMall.customer.userPreferences.post(
      connection,
      {
        body: preferenceData,
      },
    );
  typia.assert(preference);

  // Step 3: Validate the created preference matches the input data
  TestValidator.equals(
    "preference type matches",
    preference.preference_type,
    preferenceData.preference_type,
  );
  TestValidator.equals(
    "preference key matches",
    preference.preference_key,
    preferenceData.preference_key,
  );
  TestValidator.equals(
    "preference value matches",
    preference.preference_value,
    preferenceData.preference_value,
  );
  TestValidator.equals(
    "category matches",
    preference.category,
    preferenceData.category,
  );

  // Step 4: Validate preference is associated with the correct customer
  TestValidator.equals(
    "customer ID matches",
    preference.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "customer email matches",
    preference.customer.email,
    customer.email,
  );
  TestValidator.equals(
    "customer first name matches",
    preference.customer.first_name,
    customer.first_name,
  );
  TestValidator.equals(
    "customer last name matches",
    preference.customer.last_name,
    customer.last_name,
  );

  // Step 5: Validate preference is immediately active
  TestValidator.predicate("preference is active", preference.is_active);

  // Step 6: Validate timestamps are properly set
  TestValidator.predicate(
    "created_at timestamp is set",
    preference.created_at !== null && preference.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp is set",
    preference.updated_at !== null && preference.updated_at !== undefined,
  );
  TestValidator.predicate(
    "deleted_at is not set for active preference",
    preference.deleted_at === null || preference.deleted_at === undefined,
  );

  // Step 7: Validate preference has valid UUID format using typia
  typia.assert<string & tags.Format<"uuid">>(preference.id);

  // Step 8: Test duplicate preference creation should fail
  await TestValidator.error(
    "duplicate preference creation should fail",
    async () => {
      await api.functional.shoppingMall.customer.userPreferences.post(
        connection,
        {
          body: preferenceData,
        },
      );
    },
  );
}
