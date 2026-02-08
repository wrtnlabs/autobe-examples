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

export async function test_api_seller_login_successful_authentication(
  connection: api.IConnection,
): Promise<void> {
  // Actor-specific connection for seller join
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  // Call authorize_seller_join with empty join body as per DTO
  const joinResult = await authorize_seller_join(sellerJoinConnection, {
    body: {},
  });
  // Validate join result
  typia.assert(joinResult);
  // Actor-specific connection for seller login
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  // Call authorize_seller_login with empty body as per DTO
  const loginResult = await authorize_seller_login(sellerLoginConnection, {
    body: {},
  });
  // Validate login result
  typia.assert(loginResult);
  // Extract token from login result
  const token = loginResult.token;
  // Validate token has non-empty string access and refresh
  TestValidator.predicate(
    "access token exists",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  // Validate expired_at is valid ISO date string
  const expiredAtDate = new Date(token.expired_at);
  TestValidator.predicate(
    "expired_at is valid ISO date",
    !isNaN(expiredAtDate.getTime()),
  );
  // Validate refreshable_until is valid ISO date string
  const refreshableUntilDate = new Date(token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is valid ISO date",
    !isNaN(refreshableUntilDate.getTime()),
  );
  // Ensure expired_at <= refreshable_until
  TestValidator.predicate(
    "expired_at <= refreshable_until",
    expiredAtDate.getTime() <= refreshableUntilDate.getTime(),
  );
}
