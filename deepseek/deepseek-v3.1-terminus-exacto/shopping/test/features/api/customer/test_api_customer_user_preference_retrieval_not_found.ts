import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallUserPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserPreference";

/**
 * Test preference retrieval when the specified preference ID does not exist in
 * the system.
 *
 * This E2E test validates that the API properly handles requests for
 * non-existent user preferences by returning appropriate error responses. The
 * test establishes a customer context, creates a valid preference to ensure
 * proper functionality, then attempts to retrieve a preference using a UUID
 * that does not exist in the system.
 *
 * The test validates:
 *
 * 1. Customer authentication and account creation
 * 2. Successful preference creation with valid data
 * 3. Proper error handling when retrieving non-existent preferences
 * 4. Business logic validation for missing resource scenarios
 */
export async function test_api_customer_user_preference_retrieval_not_found(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "TestPassword123!",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.example.com/register",
      referrer: "https://shoppingmall.example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create a valid preference to establish customer context
  const validPreference =
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
  typia.assert(validPreference);
  TestValidator.equals(
    "created preference should be active",
    validPreference.is_active,
    true,
  );

  // Step 3: Attempt to retrieve a non-existent preference
  await TestValidator.error(
    "retrieving non-existent preference should fail",
    async () => {
      const nonExistentPreferenceId = typia.random<
        string & tags.Format<"uuid">
      >();
      await api.functional.shoppingMall.customer.userPreferences.getByPreferenceid(
        connection,
        {
          preferenceId: nonExistentPreferenceId,
        },
      );
    },
  );
}
