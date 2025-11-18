import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerAuthRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthRefresh";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

export async function test_api_seller_refresh_rejects_expired_or_invalid_token(
  connection: api.IConnection,
) {
  // 1. Register a new seller to obtain an initial authorized context and refresh token
  const joinRequest: IShoppingMallSellerAuthJoin.IRequest =
    typia.random<IShoppingMallSellerAuthJoin.IRequest>();

  const joinedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinRequest,
    });
  typia.assert(joinedSeller);

  const originalSellerId = joinedSeller.id;
  const originalSellerEmail = joinedSeller.email;
  const validRefreshToken: string = joinedSeller.token.refresh;

  // 2. Baseline: ensure a valid refresh token works
  const refreshedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.refresh(connection, {
      body: {
        refreshToken: validRefreshToken,
      } satisfies IShoppingMallSellerAuthRefresh.IRequest,
    });
  typia.assert(refreshedSeller);

  TestValidator.equals(
    "seller id must be consistent between join and refresh",
    refreshedSeller.id,
    originalSellerId,
  );
  TestValidator.equals(
    "seller email must be consistent between join and refresh",
    refreshedSeller.email,
    originalSellerEmail,
  );

  // 3. Prepare invalid refresh tokens
  const randomInvalidToken: string = `invalid-${RandomGenerator.alphaNumeric(40)}`;
  const mutatedRefreshToken: string = `${validRefreshToken}-tampered`;

  // 4. Expect refresh with a completely random token to fail
  await TestValidator.error(
    "refresh rejects random invalid token",
    async () => {
      await api.functional.auth.seller.refresh(connection, {
        body: {
          refreshToken: randomInvalidToken,
        } satisfies IShoppingMallSellerAuthRefresh.IRequest,
      });
    },
  );

  // 5. Expect refresh with a mutated version of a real token to fail
  await TestValidator.error(
    "refresh rejects mutated refresh token",
    async () => {
      await api.functional.auth.seller.refresh(connection, {
        body: {
          refreshToken: mutatedRefreshToken,
        } satisfies IShoppingMallSellerAuthRefresh.IRequest,
      });
    },
  );
}
