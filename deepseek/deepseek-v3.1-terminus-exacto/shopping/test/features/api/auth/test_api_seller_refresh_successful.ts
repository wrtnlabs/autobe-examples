import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test successful token refresh with valid refresh token.
 *
 * This E2E test validates that sellers can extend their session by providing a
 * valid, unexpired refresh token. The test follows a complete authentication
 * workflow from seller registration through login and token refresh, ensuring
 * that new tokens are issued with updated expiration timestamps while
 * maintaining session context.
 */
export async function test_api_seller_refresh_successful(
  connection: api.IConnection,
) {
  // Step 1: Create seller account for authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "TestPassword123";

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: RandomGenerator.paragraph({ sentences: 3 }),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 2 }),
      tax_id: undefined,
      ip: undefined,
      href: "https://shopping-mall.example.com/auth/seller/join",
      referrer: "https://shopping-mall.example.com/",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Login to obtain valid refresh token
  const loginResponse = await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://shopping-mall.example.com/auth/seller/login",
      referrer: "https://shopping-mall.example.com/auth/seller/join",
      ip: undefined,
      device: undefined,
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(loginResponse);

  // Verify initial tokens are received
  TestValidator.predicate(
    "login returns valid access token",
    typeof loginResponse.token.access === "string" &&
      loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "login returns valid refresh token",
    typeof loginResponse.token.refresh === "string" &&
      loginResponse.token.refresh.length > 0,
  );

  // Step 3: Use refresh token to generate new tokens
  const refreshResponse = await api.functional.auth.seller.refresh(connection, {
    body: {
      refresh_token: loginResponse.token.refresh,
      user_agent: undefined,
    } satisfies IShoppingMallSeller.IRefresh,
  });
  typia.assert(refreshResponse);

  // Step 4: Validate refresh response maintains seller identity
  TestValidator.equals(
    "seller ID remains consistent after refresh",
    refreshResponse.id,
    seller.id,
  );
  TestValidator.equals(
    "email remains consistent after refresh",
    refreshResponse.email,
    seller.email,
  );
  TestValidator.equals(
    "business name remains consistent after refresh",
    refreshResponse.business_name,
    seller.business_name,
  );
  TestValidator.equals(
    "contact person remains consistent after refresh",
    refreshResponse.contact_person,
    seller.contact_person,
  );
  TestValidator.equals(
    "phone number remains consistent after refresh",
    refreshResponse.phone_number,
    seller.phone_number,
  );
  TestValidator.equals(
    "business address remains consistent after refresh",
    refreshResponse.business_address,
    seller.business_address,
  );
  TestValidator.equals(
    "status remains consistent after refresh",
    refreshResponse.status,
    seller.status,
  );

  // Step 5: Validate new token structure
  TestValidator.predicate(
    "refresh returns new non-empty access token",
    typeof refreshResponse.token.access === "string" &&
      refreshResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh returns new non-empty refresh token",
    typeof refreshResponse.token.refresh === "string" &&
      refreshResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiration follows ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
      refreshResponse.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refresh token expiration follows ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
      refreshResponse.token.refreshable_until,
    ),
  );

  // Step 6: Verify tokens are refreshed (different from original)
  TestValidator.notEquals(
    "new access token differs from original access token",
    refreshResponse.token.access,
    loginResponse.token.access,
  );
  TestValidator.notEquals(
    "new refresh token differs from original refresh token",
    refreshResponse.token.refresh,
    loginResponse.token.refresh,
  );

  // Step 7: Validate that refreshed tokens can be used for authentication
  // The SDK automatically handles token management, so we verify the connection
  // has been updated with the new access token
  TestValidator.predicate(
    "connection headers contain authorization after refresh",
    connection.headers?.Authorization !== undefined,
  );
}
