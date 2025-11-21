import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallUserPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserPreference";

/**
 * Test that duplicate preference creation is prevented when a customer tries to
 * create a preference with the same type and key combination.
 *
 * This test validates the composite unique constraint
 *
 * @@unique([shopping_mall_customer_id, preference_type, preference_key]) in the
 * Prisma schema by ensuring that customers cannot create duplicate preference
 * settings that would cause conflicts in their user experience.
 *
 * Test Steps:
 *
 * 1. Create customer account for authentication context
 * 2. Create initial preference with specific type and key combination
 * 3. Attempt to create duplicate preference with identical type and key values
 * 4. Validate that the duplicate creation attempt fails with appropriate error
 */
export async function test_api_customer_preference_creation_duplicate_prevention(
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

  // Step 2: Create initial preference with specific type and key combination
  const preferenceType = "notification";
  const preferenceKey = "email_frequency";
  const initialPreferenceValue = "daily";

  const initialPreference =
    await api.functional.shoppingMall.customer.userPreferences.post(
      connection,
      {
        body: {
          preference_type: preferenceType,
          preference_key: preferenceKey,
          preference_value: initialPreferenceValue,
          category: "communication",
        } satisfies IShoppingMallUserPreference.ICreate,
      },
    );
  typia.assert(initialPreference);

  // Step 3: Attempt to create duplicate preference with identical type and key values
  const duplicatePreferenceValue = "weekly";

  await TestValidator.error(
    "duplicate preference creation should fail",
    async () => {
      return await api.functional.shoppingMall.customer.userPreferences.post(
        connection,
        {
          body: {
            preference_type: preferenceType,
            preference_key: preferenceKey,
            preference_value: duplicatePreferenceValue,
            category: "communication",
          } satisfies IShoppingMallUserPreference.ICreate,
        },
      );
    },
  );

  // The original preference remains unchanged by the failed duplicate creation attempt
  // Since there's no API to retrieve preferences by type/key, we trust that the constraint
  // prevented the duplicate and the original preference is preserved
}
