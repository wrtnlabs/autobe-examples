import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerRefresh";

export async function test_api_seller_refresh_failure_with_expired_refresh_token(
  connection: api.IConnection,
) {
  // 1. Prepare a syntactically valid refresh request body.
  // We cannot directly manufacture an actually expired token from here,
  // but we can send any opaque string as refreshToken; the server will
  // treat it as invalid/expired according to its own rules.
  const requestBody = {
    refreshToken: typia.random<string>(),
  } satisfies IShoppingMallSellerRefresh.IRequest;

  // 2. Call the refresh endpoint and assert that it fails.
  // We only validate that some HTTP error is thrown, not a specific
  // status code or error payload, to avoid over-constraining backend
  // behavior while still ensuring that no IShoppingMallSeller.IAuthorized
  // object is returned on failure.
  await TestValidator.httpError(
    "seller refresh with invalid/expired refresh token must fail",
    [400, 401, 403],
    async () => {
      // Any successful call would return IShoppingMallSeller.IAuthorized;
      // the httpError validator ensures that control flow never reaches
      // the point after this await without an HttpError being thrown.
      const _result = await api.functional.auth.seller.refresh(connection, {
        body: requestBody,
      });

      // Just in case the API changes to incorrectly return success,
      // add a guard that would fail the test by throwing.
      typia.assert<IShoppingMallSeller.IAuthorized>(_result);
    },
  );
}
