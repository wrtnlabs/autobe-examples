import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallUserPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserPreference";

/**
 * Test successful update of existing customer preference settings.
 *
 * This test validates that customer preferences can be properly updated while
 * maintaining data integrity. The test creates a customer account, establishes
 * an initial preference setting, then performs an update operation to modify
 * the preference value and category. The validation ensures that mutable fields
 * are correctly updated while immutable fields (preference_type,
 * preference_key) remain unchanged.
 */
export async function test_api_customer_preference_update_valid_modification(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for authentication context
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "testPassword123";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(2),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create initial preference to be updated
  const initialPreference =
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
  typia.assert(initialPreference);

  // Step 3: Update preference with new value and category
  const updatedPreference =
    await api.functional.shoppingMall.customer.userPreferences.update(
      connection,
      {
        preferenceId: initialPreference.id,
        body: {
          preference_value: "weekly",
          category: "marketing",
        } satisfies IShoppingMallUserPreference.IUpdate,
      },
    );
  typia.assert(updatedPreference);

  // Step 4: Validate that immutable fields remain unchanged
  TestValidator.equals(
    "preference_type should remain unchanged",
    updatedPreference.preference_type,
    initialPreference.preference_type,
  );

  TestValidator.equals(
    "preference_key should remain unchanged",
    updatedPreference.preference_key,
    initialPreference.preference_key,
  );

  // Step 5: Verify that updated fields reflect the changes
  TestValidator.equals(
    "preference_value should be updated",
    updatedPreference.preference_value,
    "weekly",
  );

  TestValidator.equals(
    "category should be updated",
    updatedPreference.category,
    "marketing",
  );

  // Step 6: Ensure customer ownership is maintained
  TestValidator.equals(
    "customer ID should remain the same",
    updatedPreference.customer.id,
    customer.id,
  );

  // Step 7: Validate timestamp updates
  TestValidator.predicate(
    "updated_at should be after created_at",
    new Date(updatedPreference.updated_at) >
      new Date(initialPreference.created_at),
  );

  // Step 8: Verify preference structure integrity
  TestValidator.predicate(
    "preference should remain active",
    updatedPreference.is_active === true,
  );

  TestValidator.predicate(
    "deleted_at should be null for active preference",
    updatedPreference.deleted_at === null ||
      updatedPreference.deleted_at === undefined,
  );

  // Additional validation: Test that preference_type cannot be updated
  const preferenceWithTypeUpdate =
    await api.functional.shoppingMall.customer.userPreferences.update(
      connection,
      {
        preferenceId: initialPreference.id,
        body: {
          preference_type: "display", // Attempt to change immutable field
          preference_value: "monthly",
        } satisfies IShoppingMallUserPreference.IUpdate,
      },
    );
  typia.assert(preferenceWithTypeUpdate);

  // Verify preference_type remains unchanged despite update attempt
  TestValidator.equals(
    "preference_type should remain unchanged despite update attempt",
    preferenceWithTypeUpdate.preference_type,
    initialPreference.preference_type,
  );
}
