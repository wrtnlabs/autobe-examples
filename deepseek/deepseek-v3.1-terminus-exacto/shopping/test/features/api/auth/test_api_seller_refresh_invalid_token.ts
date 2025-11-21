import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test token refresh failure with invalid refresh token.
 *
 * This test validates that providing an invalid or malformed refresh token
 * results in authentication error. The system should not issue new tokens and
 * should return appropriate error response indicating token validation failure.
 * The test establishes proper authentication context by first creating a seller
 * account, then attempts refresh with various invalid token scenarios to ensure
 * security measures are properly enforced.
 */
export async function test_api_seller_refresh_invalid_token(
  connection: api.IConnection,
) {
  // Step 1: Create seller account to establish authentication context
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "TestPassword123!",
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile("010"),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      tax_id: undefined,
      ip: undefined,
      href: "https://example.com/seller/registration",
      referrer: "https://example.com/",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Extract valid refresh token for reference
  const validRefreshToken = seller.token.refresh;

  // Step 3: Test various invalid refresh token scenarios

  // Scenario 1: Malformed token (completely invalid format)
  await TestValidator.error("malformed token should fail", async () => {
    await api.functional.auth.seller.refresh(connection, {
      body: {
        refresh_token: "invalid_malformed_token_12345",
        user_agent: "Test User Agent",
      } satisfies IShoppingMallSeller.IRefresh,
    });
  });

  // Scenario 2: Empty token
  await TestValidator.error("empty token should fail", async () => {
    await api.functional.auth.seller.refresh(connection, {
      body: {
        refresh_token: "",
        user_agent: "Test User Agent",
      } satisfies IShoppingMallSeller.IRefresh,
    });
  });

  // Scenario 3: Token with wrong structure (similar but invalid)
  await TestValidator.error("wrong structure token should fail", async () => {
    await api.functional.auth.seller.refresh(connection, {
      body: {
        refresh_token:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.payload.signature",
        user_agent: "Test User Agent",
      } satisfies IShoppingMallSeller.IRefresh,
    });
  });

  // Scenario 4: Token with special characters that break parsing
  await TestValidator.error(
    "special characters token should fail",
    async () => {
      await api.functional.auth.seller.refresh(connection, {
        body: {
          refresh_token: "token_with_\x00_null_byte_and_特殊字符",
          user_agent: "Test User Agent",
        } satisfies IShoppingMallSeller.IRefresh,
      });
    },
  );

  // Scenario 5: Very long token that exceeds reasonable limits
  await TestValidator.error("excessively long token should fail", async () => {
    await api.functional.auth.seller.refresh(connection, {
      body: {
        refresh_token: "a".repeat(10000), // 10KB token
        user_agent: "Test User Agent",
      } satisfies IShoppingMallSeller.IRefresh,
    });
  });

  // Step 4: Verify that valid token still works after invalid attempts
  const refreshedSeller = await api.functional.auth.seller.refresh(connection, {
    body: {
      refresh_token: validRefreshToken,
      user_agent: "Test User Agent",
    } satisfies IShoppingMallSeller.IRefresh,
  });
  typia.assert(refreshedSeller);

  // Validate that refresh actually produced new tokens
  TestValidator.notEquals(
    "refresh should produce new access token",
    refreshedSeller.token.access,
    seller.token.access,
  );
  TestValidator.notEquals(
    "refresh should produce new refresh token",
    refreshedSeller.token.refresh,
    seller.token.refresh,
  );
}
