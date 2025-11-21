import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Test token refresh failure scenarios with valid but non-functional tokens.
 * Validates that the system properly rejects tokens that do not correspond to
 * active customer sessions or have expired. This scenario tests security
 * validation and error handling for token refresh operations while maintaining
 * type safety.
 */
export async function test_api_customer_token_refresh_invalid_token(
  connection: api.IConnection,
) {
  // Step 1: Create a customer account for authentication context
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "TestPassword123!",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Extract the valid refresh token for reference
  const validRefreshToken = customer.token.refresh;

  // Step 2: Test with a completely different valid token format
  // This simulates a token from a different session or system
  await TestValidator.error(
    "token from different system should fail",
    async () => {
      const differentToken = typia.random<string & tags.Format<"uuid">>();
      await api.functional.auth.customer.refresh(connection, {
        body: {
          refresh_token: differentToken,
        } satisfies IShoppingMallCustomer.IRefresh,
      });
    },
  );

  // Step 3: Test with expired token scenario
  // Use a token that appears valid but doesn't correspond to an active session
  await TestValidator.error("expired-looking token should fail", async () => {
    const expiredLookingToken =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
    await api.functional.auth.customer.refresh(connection, {
      body: {
        refresh_token: expiredLookingToken,
      } satisfies IShoppingMallCustomer.IRefresh,
    });
  });

  // Step 4: Test with a token that has valid format but wrong content
  await TestValidator.error(
    "valid format but wrong content should fail",
    async () => {
      const wrongContentToken = "00000000-0000-0000-0000-000000000000";
      await api.functional.auth.customer.refresh(connection, {
        body: {
          refresh_token: wrongContentToken,
        } satisfies IShoppingMallCustomer.IRefresh,
      });
    },
  );

  // Step 5: Validate that the original valid token still works
  // This ensures our test setup is correct
  const refreshedCustomer = await api.functional.auth.customer.refresh(
    connection,
    {
      body: {
        refresh_token: validRefreshToken,
      } satisfies IShoppingMallCustomer.IRefresh,
    },
  );
  typia.assert(refreshedCustomer);
  TestValidator.equals(
    "refreshed customer email matches",
    refreshedCustomer.email,
    customerEmail,
  );
}
