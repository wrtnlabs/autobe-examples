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

export async function test_api_seller_refresh_concurrent_token_use_handling(
  connection: api.IConnection,
): Promise<void> {
  // This scenario tests concurrent refresh token requests to prevent token replay attacks.
  // After a seller completes the join operation and obtains a refresh token, issue multiple simultaneous refresh requests using the same refresh token.
  // Verify that only one request succeds and others are rejected due to token invalidation after first use.
  // Confirm that the seller session remains valid with the newly issued tokens, and that session state is consistent.
  // This secures the token refresh mechanism against replay attacks and concurrency issues.
  // 1. Seller join to obtain initial tokens
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerJoinConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(authorized);
  // Setup newly authorized connection using initial access token
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 2. Issue concurrent refresh requests with the same refresh token (body is empty as IShoppingMallSeller.IRefresh is {})
  const concurrentCount = 5;
  const refreshPromises = Array.from({ length: concurrentCount }, () => {
    return authorize_seller_refresh(sellerConnection, {
      body: {},
    });
  });
  const results = await Promise.allSettled(refreshPromises);
  // 3. Check that exactly one request succeeded, others failed
  const successes: IShoppingMallSeller.IAuthorized[] = [];
  const failures: any[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      typia.assert(result.value);
      successes.push(result.value);
    } else {
      failures.push(result.reason);
    }
  }
  // Assert exactly one success
  TestValidator.equals("one refresh success", successes.length, 1);
  TestValidator.equals("failures count", failures.length, concurrentCount - 1);
  // 4. Use the new token from successful refresh to refresh again
  const newAuthorized = successes[0];
  // Setup connection with the new access token
  const newSellerConnection: api.IConnection = { host: connection.host };
  newSellerConnection.headers = {
    Authorization: newAuthorized.token.access,
  };
  // Refresh again should succeed
  const refreshedAgain = await authorize_seller_refresh(newSellerConnection, {
    body: {},
  });
  typia.assert(refreshedAgain);
  // 5. Verify session state consistency (basic token presence and different refresh tokens)
  TestValidator.predicate(
    "valid access token",
    typeof refreshedAgain.token.access === "string",
  );
  TestValidator.predicate(
    "valid refresh token",
    typeof refreshedAgain.token.refresh === "string",
  );
  TestValidator.notEquals(
    "refresh token rotated",
    newAuthorized.token.refresh,
    refreshedAgain.token.refresh,
  );
}
