import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerRefresh";

export async function test_api_customer_join_returns_tokens_with_correct_expiry_semantics(
  connection: api.IConnection,
) {
  // 1. Prepare a valid join request body
  const joinBody = typia.random<IShoppingMallCustomerJoin.IRequest>();

  const beforeJoinNow = new Date();

  // 2. Call join API
  const joined: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // 3. Extract and validate token structure
  const token: IAuthorizationToken = joined.token;
  typia.assert(token);

  // Basic non-empty token strings
  TestValidator.predicate(
    "access token should be non-empty",
    token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be non-empty",
    token.refresh.length > 0,
  );

  // Parse dates
  const expiredAtDate = new Date(token.expired_at);
  const refreshableUntilDate = new Date(token.refreshable_until);

  // Ensure dates are valid (Date parsing)
  TestValidator.predicate(
    "expired_at should be a valid date",
    !isNaN(expiredAtDate.getTime()),
  );
  TestValidator.predicate(
    "refreshable_until should be a valid date",
    !isNaN(refreshableUntilDate.getTime()),
  );

  // Ensure expiry semantics: expired_at and refreshable_until not in the past relative to beforeJoinNow
  TestValidator.predicate(
    "expired_at should not be before join time",
    expiredAtDate.getTime() >= beforeJoinNow.getTime(),
  );
  TestValidator.predicate(
    "refreshable_until should not be before join time",
    refreshableUntilDate.getTime() >= beforeJoinNow.getTime(),
  );

  // refreshable_until should be greater or equal to expired_at
  TestValidator.predicate(
    "refreshable_until should be greater or equal to expired_at",
    refreshableUntilDate.getTime() >= expiredAtDate.getTime(),
  );

  // 4. Immediately perform a refresh using the refresh token
  const refreshed: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.refresh(connection, {
      body: {
        refreshToken: token.refresh,
      },
    });
  typia.assert(refreshed);

  const refreshedToken: IAuthorizationToken = refreshed.token;
  typia.assert(refreshedToken);

  // Ensure same customer id between join and refresh
  TestValidator.equals(
    "customer id should be stable between join and refresh",
    refreshed.id,
    joined.id,
  );

  // Non-empty tokens again
  TestValidator.predicate(
    "refreshed access token should be non-empty",
    refreshedToken.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token should be non-empty",
    refreshedToken.refresh.length > 0,
  );

  const refreshedExpiredAt = new Date(refreshedToken.expired_at);
  const refreshedRefreshableUntil = new Date(refreshedToken.refreshable_until);

  TestValidator.predicate(
    "refreshed expired_at should be a valid date",
    !isNaN(refreshedExpiredAt.getTime()),
  );
  TestValidator.predicate(
    "refreshed refreshable_until should be a valid date",
    !isNaN(refreshedRefreshableUntil.getTime()),
  );

  // Refreshed expiry values should not move backwards in time relative to original ones
  TestValidator.predicate(
    "refreshed expired_at should be >= original expired_at",
    refreshedExpiredAt.getTime() >= expiredAtDate.getTime(),
  );
  TestValidator.predicate(
    "refreshed refreshable_until should be >= original refreshable_until",
    refreshedRefreshableUntil.getTime() >= refreshableUntilDate.getTime(),
  );

  // Also ensure refreshed refreshable_until still >= refreshed expired_at
  TestValidator.predicate(
    "refreshed refreshable_until should be >= refreshed expired_at",
    refreshedRefreshableUntil.getTime() >= refreshedExpiredAt.getTime(),
  );
}
