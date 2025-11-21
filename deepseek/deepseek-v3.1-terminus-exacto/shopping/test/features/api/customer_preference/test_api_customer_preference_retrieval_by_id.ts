import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallUserPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserPreference";

/**
 * Test successful retrieval of specific customer preference by its unique
 * identifier within customer scope.
 *
 * This test validates the complete preference lifecycle: customer creation →
 * preference creation → preference retrieval → comprehensive validation. It
 * ensures that preference details including type, key, value, category, and
 * activation status are correctly returned, and that the preference is properly
 * scoped to the specific customer account.
 */
export async function test_api_customer_preference_retrieval_by_id(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for authentication context
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "testPassword123",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.example.com/register",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create preference setting for retrieval test
  const preferenceData = {
    preference_type: "notification",
    preference_key: "email_frequency",
    preference_value: "daily",
    category: "communication",
  } satisfies IShoppingMallUserPreference.ICreate;

  const createdPreference =
    await api.functional.shoppingMall.customer.userPreferences.postByCustomerid(
      connection,
      {
        customerId: customer.id,
        body: preferenceData,
      },
    );
  typia.assert(createdPreference);

  // Step 3: Retrieve the created preference using customer ID and preference ID
  const retrievedPreference =
    await api.functional.shoppingMall.customer.userPreferences.getByCustomeridAndPreferenceid(
      connection,
      {
        customerId: customer.id,
        preferenceId: createdPreference.id,
      },
    );
  typia.assert(retrievedPreference);

  // Step 4: Comprehensive validation of retrieved preference
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
  TestValidator.predicate(
    "preference is active",
    retrievedPreference.is_active,
  );
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
  TestValidator.predicate(
    "created_at timestamp is set",
    !!retrievedPreference.created_at,
  );
  TestValidator.predicate(
    "updated_at timestamp is set",
    !!retrievedPreference.updated_at,
  );
}
