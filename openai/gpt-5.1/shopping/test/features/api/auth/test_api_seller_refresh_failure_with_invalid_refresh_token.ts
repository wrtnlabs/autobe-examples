import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerRefresh";

export async function test_api_seller_refresh_failure_with_invalid_refresh_token(
  connection: api.IConnection,
) {
  /**
   * Validate that seller refresh endpoint rejects invalid refresh tokens.
   *
   * This E2E test covers multiple negative scenarios where the provided
   * `refreshToken` is structurally valid as a string but semantically invalid
   * from the platform perspective (never issued, expired, or malformed
   * content). In all such cases, the backend must not issue a new seller
   * authorization context and should instead respond with an HTTP error.
   *
   * Test scenarios:
   *
   * 1. Completely random opaque token string that does not exist in token store
   * 2. Token-shaped but clearly invalid/expired-looking string
   * 3. Empty string token
   */

  // 1. Completely random opaque token (alphanumeric) which should not exist
  const randomOpaqueToken: string = RandomGenerator.alphaNumeric(64);
  const randomOpaqueRequest = {
    refreshToken: randomOpaqueToken,
  } satisfies IShoppingMallSellerRefresh.IRequest;

  await TestValidator.error(
    "seller refresh with random opaque token must fail",
    async () => {
      await api.functional.auth.seller.refresh(connection, {
        body: randomOpaqueRequest,
      });
    },
  );

  // 2. Token-shaped but clearly invalid/expired-looking string
  const tokenShapedInvalid: string = `expired-refresh-token-${RandomGenerator.alphaNumeric(32)}`;
  const tokenShapedRequest = {
    refreshToken: tokenShapedInvalid,
  } satisfies IShoppingMallSellerRefresh.IRequest;

  await TestValidator.error(
    "seller refresh with token-shaped invalid string must fail",
    async () => {
      await api.functional.auth.seller.refresh(connection, {
        body: tokenShapedRequest,
      });
    },
  );

  // 3. Empty string token (still a string, but should be rejected by business validation)
  const emptyTokenRequest = {
    refreshToken: "",
  } satisfies IShoppingMallSellerRefresh.IRequest;

  await TestValidator.error(
    "seller refresh with empty token must fail",
    async () => {
      await api.functional.auth.seller.refresh(connection, {
        body: emptyTokenRequest,
      });
    },
  );
}
