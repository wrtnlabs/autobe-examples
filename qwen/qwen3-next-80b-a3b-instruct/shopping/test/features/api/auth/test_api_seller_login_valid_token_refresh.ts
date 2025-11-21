import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_login_valid_token_refresh(
  connection: api.IConnection,
) {
  const request: IShoppingMallSeller.IRequest = {};

  const loginResponse: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: request,
    });
  typia.assert(loginResponse);

  const refreshResponse: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.refresh(connection, {
      body: request,
    });
  typia.assert(refreshResponse);

  TestValidator.equals(
    "refresh endpoint returns different access token",
    loginResponse.token.access !== refreshResponse.token.access,
    true,
  );
  TestValidator.equals(
    "refresh endpoint returns different refresh token",
    loginResponse.token.refresh !== refreshResponse.token.refresh,
    true,
  );
  TestValidator.equals(
    "seller ID unchanged after refresh",
    loginResponse.id,
    refreshResponse.id,
  );
  TestValidator.equals(
    "seller email unchanged after refresh",
    loginResponse.email,
    refreshResponse.email,
  );
  TestValidator.equals(
    "business name unchanged after refresh",
    loginResponse.business_name,
    refreshResponse.business_name,
  );
  TestValidator.equals(
    "status unchanged after refresh",
    loginResponse.status,
    refreshResponse.status,
  );
  TestValidator.predicate(
    "new access token expired later than old",
    refreshResponse.token.expired_at > loginResponse.token.expired_at,
  );
  TestValidator.predicate(
    "new refresh token refreshable later than old",
    refreshResponse.token.refreshable_until >
      loginResponse.token.refreshable_until,
  );
}
