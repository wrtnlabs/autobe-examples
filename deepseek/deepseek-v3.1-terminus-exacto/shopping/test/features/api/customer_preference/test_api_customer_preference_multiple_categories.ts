import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallUserPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserPreference";

/**
 * Comprehensive E2E test for customer preference management across multiple
 * categories.
 *
 * This test validates the creation and management of customer preferences
 * including notification settings, display preferences, privacy controls, and
 * shopping behavior configurations. It ensures the preference system properly
 * handles diverse preference types while maintaining uniqueness constraints and
 * proper customer association.
 */
export async function test_api_customer_preference_multiple_categories(
  connection: api.IConnection,
) {
  // Step 1: Create customer account for authentication context
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

  // Step 2: Create notification preferences with realistic values
  const notificationPreference: IShoppingMallUserPreference =
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
  typia.assert(notificationPreference);
  TestValidator.equals(
    "notification preference type",
    notificationPreference.preference_type,
    "notification",
  );
  TestValidator.equals(
    "notification preference key",
    notificationPreference.preference_key,
    "email_frequency",
  );
  TestValidator.equals(
    "notification preference value",
    notificationPreference.preference_value,
    "daily",
  );
  TestValidator.equals(
    "notification preference category",
    notificationPreference.category,
    "communication",
  );
  TestValidator.equals(
    "notification preference customer ID",
    notificationPreference.customer.id,
    customer.id,
  );

  // Step 3: Create display preferences with realistic theme options
  const displayPreference: IShoppingMallUserPreference =
    await api.functional.shoppingMall.customer.userPreferences.post(
      connection,
      {
        body: {
          preference_type: "display",
          preference_key: "theme",
          preference_value: "dark",
          category: "appearance",
        } satisfies IShoppingMallUserPreference.ICreate,
      },
    );
  typia.assert(displayPreference);
  TestValidator.equals(
    "display preference type",
    displayPreference.preference_type,
    "display",
  );
  TestValidator.equals(
    "display preference key",
    displayPreference.preference_key,
    "theme",
  );
  TestValidator.equals(
    "display preference value",
    displayPreference.preference_value,
    "dark",
  );
  TestValidator.equals(
    "display preference category",
    displayPreference.category,
    "appearance",
  );
  TestValidator.equals(
    "display preference customer ID",
    displayPreference.customer.id,
    customer.id,
  );

  // Step 4: Create privacy preferences with realistic data sharing options
  const privacyPreference: IShoppingMallUserPreference =
    await api.functional.shoppingMall.customer.userPreferences.post(
      connection,
      {
        body: {
          preference_type: "privacy",
          preference_key: "data_sharing",
          preference_value: "limited",
          category: "security",
        } satisfies IShoppingMallUserPreference.ICreate,
      },
    );
  typia.assert(privacyPreference);
  TestValidator.equals(
    "privacy preference type",
    privacyPreference.preference_type,
    "privacy",
  );
  TestValidator.equals(
    "privacy preference key",
    privacyPreference.preference_key,
    "data_sharing",
  );
  TestValidator.equals(
    "privacy preference value",
    privacyPreference.preference_value,
    "limited",
  );
  TestValidator.equals(
    "privacy preference category",
    privacyPreference.category,
    "security",
  );
  TestValidator.equals(
    "privacy preference customer ID",
    privacyPreference.customer.id,
    customer.id,
  );

  // Step 5: Create shopping behavior preferences with realistic frequency options
  const shoppingPreference: IShoppingMallUserPreference =
    await api.functional.shoppingMall.customer.userPreferences.post(
      connection,
      {
        body: {
          preference_type: "shopping",
          preference_key: "recommendation_frequency",
          preference_value: "weekly",
          category: "behavior",
        } satisfies IShoppingMallUserPreference.ICreate,
      },
    );
  typia.assert(shoppingPreference);
  TestValidator.equals(
    "shopping preference type",
    shoppingPreference.preference_type,
    "shopping",
  );
  TestValidator.equals(
    "shopping preference key",
    shoppingPreference.preference_key,
    "recommendation_frequency",
  );
  TestValidator.equals(
    "shopping preference value",
    shoppingPreference.preference_value,
    "weekly",
  );
  TestValidator.equals(
    "shopping preference category",
    shoppingPreference.category,
    "behavior",
  );
  TestValidator.equals(
    "shopping preference customer ID",
    shoppingPreference.customer.id,
    customer.id,
  );

  // Step 6: Validate uniqueness constraint by attempting to create duplicate preference
  await TestValidator.error(
    "should reject duplicate preference type/key combination",
    async () => {
      await api.functional.shoppingMall.customer.userPreferences.post(
        connection,
        {
          body: {
            preference_type: "notification",
            preference_key: "email_frequency",
            preference_value: "weekly",
            category: "communication",
          } satisfies IShoppingMallUserPreference.ICreate,
        },
      );
    },
  );

  // Step 7: Create additional preference with different key but same type
  const additionalNotificationPreference: IShoppingMallUserPreference =
    await api.functional.shoppingMall.customer.userPreferences.post(
      connection,
      {
        body: {
          preference_type: "notification",
          preference_key: "push_order_updates",
          preference_value: "true",
          category: "communication",
        } satisfies IShoppingMallUserPreference.ICreate,
      },
    );
  typia.assert(additionalNotificationPreference);
  TestValidator.equals(
    "additional notification preference type",
    additionalNotificationPreference.preference_type,
    "notification",
  );
  TestValidator.equals(
    "additional notification preference key",
    additionalNotificationPreference.preference_key,
    "push_order_updates",
  );
  TestValidator.equals(
    "additional notification preference value",
    additionalNotificationPreference.preference_value,
    "true",
  );
  TestValidator.equals(
    "additional notification preference customer ID",
    additionalNotificationPreference.customer.id,
    customer.id,
  );

  // Step 8: Verify all preferences have correct customer association
  const preferences = [
    notificationPreference,
    displayPreference,
    privacyPreference,
    shoppingPreference,
    additionalNotificationPreference,
  ];

  TestValidator.predicate(
    "all preferences belong to the same customer",
    preferences.every((pref) => pref.customer.id === customer.id),
  );

  TestValidator.predicate(
    "preferences have unique IDs",
    new Set(preferences.map((pref) => pref.id)).size === preferences.length,
  );

  // Step 9: Validate preference structure integrity
  preferences.forEach((pref) => {
    TestValidator.predicate(
      "preference has valid ID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        pref.id,
      ),
    );
    TestValidator.predicate("preference is active", pref.is_active === true);
    TestValidator.predicate(
      "preference has creation timestamp",
      typeof pref.created_at === "string" && pref.created_at.length > 0,
    );
    TestValidator.predicate(
      "preference has update timestamp",
      typeof pref.updated_at === "string" && pref.updated_at.length > 0,
    );
  });
}
