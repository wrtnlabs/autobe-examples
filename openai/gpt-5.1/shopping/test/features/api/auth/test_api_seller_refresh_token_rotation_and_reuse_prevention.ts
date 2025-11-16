import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerRefresh";

/**
 * Validate seller refresh token rotation semantics for the seller auth
 * endpoint.
 *
 * Business focus:
 *
 * - Each successful refresh must issue a brand new access/refresh token pair.
 * - Seller identity (id/email/store_name/status) must remain stable across
 *   refreshes.
 * - Client must rely on the newly issued refresh token after each refresh instead
 *   of reusing older tokens.
 *
 * Limitations:
 *
 * - Only the POST /auth/seller/refresh endpoint is available in this scope, so we
 *   cannot perform a full login flow or force a guaranteed error on reuse of an
 *   old refresh token.
 * - Therefore this test concentrates on positive-path rotation behavior: repeated
 *   valid refreshes using the latest refresh token must keep rotating the token
 *   while preserving seller identity.
 */
export async function test_api_seller_refresh_token_rotation_and_reuse_prevention(
  connection: api.IConnection,
) {
  // Prepare an initial synthetic authorized seller object to obtain a
  // starting refresh token string. This object is used only as a fixture
  // to supply the first refresh token payload.
  const initialAuthorized: IShoppingMallSeller.IAuthorized =
    typia.random<IShoppingMallSeller.IAuthorized>();
  typia.assert<IShoppingMallSeller.IAuthorized>(initialAuthorized);

  const originalRefreshToken: string = initialAuthorized.token.refresh;

  // 1st refresh: use the original refresh token to get a fresh token pair.
  const firstRequestBody = {
    refreshToken: originalRefreshToken,
  } satisfies IShoppingMallSellerRefresh.IRequest;

  const authorized1: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.refresh(connection, {
      body: firstRequestBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(authorized1);

  const rotatedToken1: IAuthorizationToken = authorized1.token;

  // The rotated refresh token should differ from the original one.
  TestValidator.predicate(
    "first refresh must rotate refresh token",
    rotatedToken1.refresh !== originalRefreshToken,
  );

  // Seller identity must remain the same across refresh.
  TestValidator.equals(
    "seller id must remain stable after first refresh",
    authorized1.id,
    initialAuthorized.id,
  );
  TestValidator.equals(
    "seller email must remain stable after first refresh",
    authorized1.email,
    initialAuthorized.email,
  );
  TestValidator.equals(
    "seller store_name must remain stable after first refresh",
    authorized1.store_name,
    initialAuthorized.store_name,
  );
  TestValidator.equals(
    "seller status must remain stable after first refresh",
    authorized1.status,
    initialAuthorized.status,
  );

  // 2nd refresh: use the newly rotated refresh token from the first
  // response. This simulates the correct client behavior of always using
  // the latest refresh token instead of reusing old ones.
  const secondRequestBody = {
    refreshToken: rotatedToken1.refresh,
  } satisfies IShoppingMallSellerRefresh.IRequest;

  const authorized2: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.refresh(connection, {
      body: secondRequestBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(authorized2);

  const rotatedToken2: IAuthorizationToken = authorized2.token;

  // The second rotated refresh token must differ both from the first
  // rotated token and from the original token. This verifies continuous
  // rotation across successive valid refreshes.
  TestValidator.predicate(
    "second refresh must rotate refresh token again",
    rotatedToken2.refresh !== rotatedToken1.refresh,
  );
  TestValidator.predicate(
    "second refresh token must differ from original token",
    rotatedToken2.refresh !== originalRefreshToken,
  );

  // Seller identity remains stable across multiple refreshes.
  TestValidator.equals(
    "seller id must remain stable after second refresh",
    authorized2.id,
    authorized1.id,
  );
  TestValidator.equals(
    "seller email must remain stable after second refresh",
    authorized2.email,
    authorized1.email,
  );
  TestValidator.equals(
    "seller store_name must remain stable after second refresh",
    authorized2.store_name,
    authorized1.store_name,
  );
  TestValidator.equals(
    "seller status must remain stable after second refresh",
    authorized2.status,
    authorized1.status,
  );
}
