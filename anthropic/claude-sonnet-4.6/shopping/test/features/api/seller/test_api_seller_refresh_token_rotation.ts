import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_refresh_token_rotation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new seller to obtain initial session
  const sellerConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const shopName = RandomGenerator.name();
  const joinResponse = await authorize_seller_join(sellerConnection, {
    body: {
      email,
      password,
      shop_name: shopName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResponse);
  // Capture the original tokens
  const originalAccessToken = joinResponse.token.access;
  const originalRefreshToken = joinResponse.token.refresh;
  // Step 2: Use refresh token to obtain a new token pair via utility
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResponse = await authorize_seller_refresh(refreshConnection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies IShoppingMallSeller.IRefresh,
  });
  typia.assert(refreshResponse);
  // Step 3: Verify token rotation - new tokens must differ from original
  TestValidator.notEquals(
    "new access token differs from original",
    refreshResponse.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token differs from original",
    refreshResponse.token.refresh,
    originalRefreshToken,
  );
  // Step 4: Verify timestamps are valid (not empty strings)
  TestValidator.predicate(
    "expired_at is a non-empty datetime string",
    refreshResponse.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until is a non-empty datetime string",
    refreshResponse.token.refreshable_until.length > 0,
  );
  // Step 5: Verify seller data matches the registered seller
  TestValidator.equals(
    "seller id matches",
    refreshResponse.id,
    joinResponse.id,
  );
  TestValidator.equals(
    "seller email matches",
    refreshResponse.email,
    joinResponse.email,
  );
  TestValidator.equals(
    "seller shopName matches",
    refreshResponse.shopName,
    joinResponse.shopName,
  );
  TestValidator.equals(
    "seller isBanned is false",
    refreshResponse.isBanned,
    false,
  );
  TestValidator.equals(
    "seller isSuspended is false",
    refreshResponse.isSuspended,
    false,
  );
  TestValidator.equals(
    "seller deletedAt is null",
    refreshResponse.deletedAt,
    null,
  );
  // Step 6: Verify nested seller object mirrors top-level fields
  TestValidator.equals(
    "nested seller id matches",
    refreshResponse.seller.id,
    refreshResponse.id,
  );
  TestValidator.equals(
    "nested seller email matches",
    refreshResponse.seller.email,
    refreshResponse.email,
  );
  TestValidator.equals(
    "nested seller shopName matches",
    refreshResponse.seller.shopName,
    refreshResponse.shopName,
  );
  TestValidator.equals(
    "nested seller isBanned is false",
    refreshResponse.seller.isBanned,
    false,
  );
  TestValidator.equals(
    "nested seller isSuspended is false",
    refreshResponse.seller.isSuspended,
    false,
  );
  TestValidator.equals(
    "nested seller deletedAt is null",
    refreshResponse.seller.deletedAt,
    null,
  );
  // Step 7: Verify old refresh token has been invalidated (token rotation enforcement)
  const replayConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "old refresh token is rejected after rotation",
    async () => {
      await authorize_seller_refresh(replayConnection, {
        body: {
          refresh_token: originalRefreshToken,
        } satisfies IShoppingMallSeller.IRefresh,
      });
    },
  );
}
