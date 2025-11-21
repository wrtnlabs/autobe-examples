import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallUserPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserPreference";

/**
 * Test customer preference activation status toggle functionality.
 *
 * Validates that customers can properly activate and deactivate their
 * preferences through the update operation. Tests the complete lifecycle of
 * preference status management including initial active state creation,
 * deactivation, and reactivation.
 */
export async function test_api_customer_preference_update_activation_status_change(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for authentication context
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "testPassword123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.example.com/register",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);
  TestValidator.equals(
    "customer should be created successfully",
    customer.email,
    customerEmail,
  );

  // Step 2: Create preference with active status
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
  TestValidator.equals(
    "initial preference should be active",
    initialPreference.is_active,
    true,
  );
  TestValidator.equals(
    "preference type should be set correctly",
    initialPreference.preference_type,
    "notification",
  );
  TestValidator.equals(
    "preference key should be set correctly",
    initialPreference.preference_key,
    "email_frequency",
  );

  // Step 3: Deactivate the preference
  const deactivatedPreference =
    await api.functional.shoppingMall.customer.userPreferences.update(
      connection,
      {
        preferenceId: initialPreference.id,
        body: {
          is_active: false,
        } satisfies IShoppingMallUserPreference.IUpdate,
      },
    );
  typia.assert(deactivatedPreference);
  TestValidator.equals(
    "preference should be deactivated",
    deactivatedPreference.is_active,
    false,
  );
  TestValidator.equals(
    "preference ID should remain unchanged after deactivation",
    deactivatedPreference.id,
    initialPreference.id,
  );

  // Step 4: Reactivate the preference
  const reactivatedPreference =
    await api.functional.shoppingMall.customer.userPreferences.update(
      connection,
      {
        preferenceId: initialPreference.id,
        body: {
          is_active: true,
        } satisfies IShoppingMallUserPreference.IUpdate,
      },
    );
  typia.assert(reactivatedPreference);
  TestValidator.equals(
    "preference should be reactivated",
    reactivatedPreference.is_active,
    true,
  );
  TestValidator.equals(
    "preference ID should remain unchanged after reactivation",
    reactivatedPreference.id,
    initialPreference.id,
  );

  // Step 5: Validate preference properties remain immutable through status changes
  TestValidator.equals(
    "preference type should remain unchanged through status changes",
    reactivatedPreference.preference_type,
    "notification",
  );
  TestValidator.equals(
    "preference key should remain unchanged through status changes",
    reactivatedPreference.preference_key,
    "email_frequency",
  );
  TestValidator.equals(
    "preference value should remain unchanged through status changes",
    reactivatedPreference.preference_value,
    "daily",
  );
  TestValidator.equals(
    "preference category should remain unchanged through status changes",
    reactivatedPreference.category,
    "communication",
  );
}
