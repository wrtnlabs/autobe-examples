import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_refresh_token_success(
  connection: api.IConnection,
) {
  // Step 1: Seller account creation and initial authentication via join endpoint
  const sellerCreationBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "validPassword123!",
  } satisfies IShoppingMallSeller.ICreate;

  const initialAuthorization: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreationBody,
    });
  typia.assert(initialAuthorization);

  // Step 2: Using the refresh token from initial authorization to refresh tokens
  const refreshRequestBody = {
    refresh_token: initialAuthorization.token.refresh,
  } satisfies IShoppingMallSeller.IRefresh;

  const refreshedAuthorization: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.refresh(connection, {
      body: refreshRequestBody,
    });
  typia.assert(refreshedAuthorization);

  // Step 3: Validate that the new tokens and metadata are correct and extended

  // Tokens should be non-empty and different from the initial tokens
  TestValidator.predicate(
    "access token should be newly issued and non-empty",
    refreshedAuthorization.token.access.length > 0 &&
      refreshedAuthorization.token.access !== initialAuthorization.token.access,
  );

  TestValidator.predicate(
    "refresh token should be newly issued and non-empty",
    refreshedAuthorization.token.refresh.length > 0 &&
      refreshedAuthorization.token.refresh !==
        initialAuthorization.token.refresh,
  );

  // Expiry timestamps should be valid ISO 8601 and token expiry extended
  const initialExpiredAt = new Date(
    initialAuthorization.token.expired_at,
  ).getTime();
  const refreshedExpiredAt = new Date(
    refreshedAuthorization.token.expired_at,
  ).getTime();

  TestValidator.predicate(
    "refreshed token expired_at should be later than initial",
    refreshedExpiredAt > initialExpiredAt,
  );

  const initialRefreshableUntil = new Date(
    initialAuthorization.token.refreshable_until,
  ).getTime();
  const refreshedRefreshableUntil = new Date(
    refreshedAuthorization.token.refreshable_until,
  ).getTime();

  TestValidator.predicate(
    "refreshed token refreshable_until should be later than initial",
    refreshedRefreshableUntil > initialRefreshableUntil,
  );
}
