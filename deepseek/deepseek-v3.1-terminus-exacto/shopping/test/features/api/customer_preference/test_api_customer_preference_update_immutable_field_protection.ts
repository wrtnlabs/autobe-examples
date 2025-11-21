import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallUserPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserPreference";

/**
 * Test that immutable preference fields (preference_type and preference_key)
 * cannot be modified through update operations.
 *
 * This test validates the business rule that once a preference is created with
 * specific type and key values, these fields become immutable and cannot be
 * changed through update operations. The system should preserve the original
 * values while allowing updates to mutable fields like preference_value and
 * category.
 *
 * Test Steps:
 *
 * 1. Create customer account for authentication
 * 2. Create initial preference with specific type and key
 * 3. Attempt to update preference with modified immutable fields
 * 4. Verify immutable fields remain unchanged
 * 5. Confirm mutable fields are properly updated
 */
export async function test_api_customer_preference_update_immutable_field_protection(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.com/register",
      referrer: "https://shoppingmall.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create initial preference with specific type and key
  const preferenceTypes = [
    "notification_settings",
    "display_preferences",
    "privacy_controls",
  ] as const;
  const preferenceKeys = ["email_frequency", "theme", "data_sharing"] as const;

  const initialPreferenceType = RandomGenerator.pick(preferenceTypes);
  const initialPreferenceKey = RandomGenerator.pick(preferenceKeys);

  const initialPreference =
    await api.functional.shoppingMall.customer.userPreferences.post(
      connection,
      {
        body: {
          preference_type: initialPreferenceType,
          preference_key: initialPreferenceKey,
          preference_value: RandomGenerator.paragraph({ sentences: 2 }),
          category: RandomGenerator.name(),
        } satisfies IShoppingMallUserPreference.ICreate,
      },
    );
  typia.assert(initialPreference);

  // Step 3: Attempt to update preference with modified immutable fields
  const updateAttempt =
    await api.functional.shoppingMall.customer.userPreferences.update(
      connection,
      {
        preferenceId: initialPreference.id,
        body: {
          preference_type: "modified_type", // Attempt to change immutable field
          preference_key: "modified_key", // Attempt to change immutable field
          preference_value: RandomGenerator.paragraph({ sentences: 3 }),
          category: RandomGenerator.name(),
          is_active: false,
        } satisfies IShoppingMallUserPreference.IUpdate,
      },
    );
  typia.assert(updateAttempt);

  // Step 4: Verify immutable fields remain unchanged
  TestValidator.equals(
    "preference_type should remain unchanged despite update attempt",
    updateAttempt.preference_type,
    initialPreference.preference_type,
  );

  TestValidator.equals(
    "preference_key should remain unchanged despite update attempt",
    updateAttempt.preference_key,
    initialPreference.preference_key,
  );

  // Step 5: Confirm mutable fields are properly updated
  TestValidator.notEquals(
    "preference_value should be updated",
    updateAttempt.preference_value,
    initialPreference.preference_value,
  );

  TestValidator.notEquals(
    "category should be updated",
    updateAttempt.category,
    initialPreference.category,
  );

  TestValidator.notEquals(
    "is_active should be updated",
    updateAttempt.is_active,
    initialPreference.is_active,
  );

  // Validate timestamp updates
  TestValidator.notEquals(
    "updated_at timestamp should change after update",
    updateAttempt.updated_at,
    initialPreference.updated_at,
  );

  // Validate unchanged system fields
  TestValidator.equals(
    "id should remain unchanged",
    updateAttempt.id,
    initialPreference.id,
  );

  TestValidator.equals(
    "created_at should remain unchanged",
    updateAttempt.created_at,
    initialPreference.created_at,
  );

  TestValidator.equals(
    "customer reference should remain unchanged",
    updateAttempt.customer.id,
    initialPreference.customer.id,
  );

  // Test edge case: Update with null/undefined immutable fields
  const edgeCaseUpdate =
    await api.functional.shoppingMall.customer.userPreferences.update(
      connection,
      {
        preferenceId: initialPreference.id,
        body: {
          preference_type: undefined, // Attempt with undefined
          preference_key: null as any, // Attempt with null (using satisfies pattern)
          preference_value: "final_value",
        } satisfies IShoppingMallUserPreference.IUpdate,
      },
    );
  typia.assert(edgeCaseUpdate);

  // Verify edge case immutable fields remain unchanged
  TestValidator.equals(
    "preference_type should remain unchanged with undefined update attempt",
    edgeCaseUpdate.preference_type,
    initialPreference.preference_type,
  );

  TestValidator.equals(
    "preference_key should remain unchanged with null update attempt",
    edgeCaseUpdate.preference_key,
    initialPreference.preference_key,
  );

  // Final validation: The update operation should complete successfully without errors
  TestValidator.predicate(
    "update operation should complete successfully despite immutable field modification attempts",
    updateAttempt !== null && edgeCaseUpdate !== null,
  );
}
