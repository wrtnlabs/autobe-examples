import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test token refresh functionality for seller accounts.
 *
 * This test validates the token refresh mechanism for seller accounts. Since
 * the provided APIs do not include functionality to suspend accounts, this test
 * focuses on validating that token refresh works correctly for active accounts,
 * which is the primary use case.
 *
 * The test follows this workflow:
 *
 * 1. Create a seller account through the join endpoint
 * 2. Login to obtain valid refresh token
 * 3. Use the refresh token to obtain a new access token
 * 4. Verify that the refresh operation works correctly
 */
export async function test_api_seller_refresh_suspended_account(
  connection: api.IConnection,
) {
  // Step 1: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "testPassword123";

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      tax_id: undefined,
      ip: undefined,
      href: "https://example.com/seller/register",
      referrer: "https://example.com/seller",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Login to obtain refresh token
  const loginResult = await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: undefined,
      href: "https://example.com/seller/login",
      referrer: "https://example.com/seller",
      device: undefined,
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(loginResult);

  // Store the refresh token for later use
  const refreshToken = loginResult.token.refresh;

  // Step 3: Attempt token refresh
  const refreshResult = await api.functional.auth.seller.refresh(connection, {
    body: {
      refresh_token: refreshToken,
      user_agent: undefined,
    } satisfies IShoppingMallSeller.IRefresh,
  });
  typia.assert(refreshResult);

  // Step 4: Validate refresh was successful
  TestValidator.equals(
    "refresh should return new access token",
    typeof refreshResult.token.access,
    "string",
  );
  TestValidator.notEquals(
    "new access token should differ from original",
    refreshResult.token.access,
    loginResult.token.access,
  );
  TestValidator.equals(
    "seller ID should remain the same",
    refreshResult.id,
    seller.id,
  );
  TestValidator.equals(
    "seller email should remain the same",
    refreshResult.email,
    seller.email,
  );
}
