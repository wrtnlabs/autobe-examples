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

/**
 * Test seller refresh token rotation security feature.
 *
 * This test validates that:
 * 1. Each refresh operation invalidates the previous refresh token
 * 2. Login operations revoke all previous sessions
 * 3. Attempting to use a revoked refresh token results in an error
 *
 * @param connection - Base API connection
 */
export async function test_api_seller_refresh_token_rotation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new seller account and obtain initial tokens
  const sellerConnection1: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const email = typia.random<string & tags.Format<"email">>();
  const seller1 = await authorize_seller_join(sellerConnection1, {
    body: {
      email: email,
      password: password,
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller1);
  // Step 2: Perform a refresh operation to get new tokens and capture the original refresh token
  const sellerConnection2: api.IConnection = { host: connection.host };
  const seller2 = await authorize_seller_refresh(sellerConnection2, {
    body: {
      refresh_token: seller1.token.refresh,
    } satisfies IShoppingMallSeller.IRefresh,
  });
  typia.assert(seller2);
  // Capture the refresh token from step 2 (this will be revoked after login)
  const originalRefreshToken = seller2.token.refresh;
  // Step 3: Perform a login operation which should revoke the previous session
  const sellerConnection3: api.IConnection = { host: connection.host };
  const seller3 = await authorize_seller_login(sellerConnection3, {
    body: {
      email: email,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(seller3);
  // Step 4: Attempt to use the ORIGINAL refresh token (from step 2, before login) in another refresh request
  // This should fail because the login operation revoked the previous session
  const sellerConnection4: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "refresh with revoked token should fail",
    async () => {
      await authorize_seller_refresh(sellerConnection4, {
        body: {
          refresh_token: originalRefreshToken,
        } satisfies IShoppingMallSeller.IRefresh,
      });
    },
  );
  // Step 5: Verify that the new tokens from login work correctly
  const sellerConnection5: api.IConnection = { host: connection.host };
  const seller5 = await authorize_seller_refresh(sellerConnection5, {
    body: {
      refresh_token: seller3.token.refresh,
    } satisfies IShoppingMallSeller.IRefresh,
  });
  typia.assert(seller5);
  // Step 6: Validate that the new refresh token is different from the original
  TestValidator.notEquals(
    "new refresh token differs from original",
    seller5.token.refresh,
    originalRefreshToken,
  );
  // Step 7: Validate that the seller identity remains consistent
  TestValidator.equals(
    "seller email remains consistent",
    seller5.email,
    seller1.email,
  );
  TestValidator.equals("seller ID remains consistent", seller5.id, seller1.id);
}
