import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";

export async function test_api_guest_token_refresh_success(
  connection: api.IConnection,
) {
  // Step 1: Create guest session for refresh functionality testing
  const guestCreateData = {
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: "https://shopping-mall.com/products",
    referrer: "https://google.com/search",
    session_id: RandomGenerator.alphaNumeric(32),
    user_agent: RandomGenerator.name(),
    last_activity_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IShoppingMallGuest.ICreate;

  const originalGuest = await api.functional.auth.guest.join(connection, {
    body: guestCreateData,
  });
  typia.assert(originalGuest);

  // Step 2: Store original session data for validation
  const originalSessionId = originalGuest.session_id;
  const originalToken = originalGuest.token;
  const originalLastActivity = originalGuest.last_activity_at;

  // Step 3: Test token refresh operation
  const refreshData = {
    session_id: originalSessionId,
  } satisfies IShoppingMallGuest.IRefresh;

  const refreshedGuest = await api.functional.auth.guest.refresh(connection, {
    body: refreshData,
  });
  typia.assert(refreshedGuest);

  // Step 4: Validate refresh operation maintains core identity properties
  TestValidator.equals(
    "session_id unchanged after refresh",
    refreshedGuest.session_id,
    originalSessionId,
  );
  TestValidator.equals(
    "ip_address unchanged after refresh",
    refreshedGuest.ip_address,
    originalGuest.ip_address,
  );
  TestValidator.equals(
    "user_agent unchanged after refresh",
    refreshedGuest.user_agent,
    originalGuest.user_agent,
  );
  TestValidator.equals(
    "guest ID unchanged after refresh",
    refreshedGuest.id,
    originalGuest.id,
  );

  // Step 5: Validate token expiration times are properly updated
  TestValidator.notEquals(
    "expiration time changed after refresh",
    refreshedGuest.token.expired_at,
    originalToken.expired_at,
  );
  TestValidator.notEquals(
    "refreshable time changed after refresh",
    refreshedGuest.token.refreshable_until,
    originalToken.refreshable_until,
  );

  // Step 6: Verify connection header is updated with new authorization token
  TestValidator.predicate(
    "connection header contains new access token",
    connection.headers!.Authorization === refreshedGuest.token.access,
  );

  // Step 7: Verify refreshed timestamps reflect recent activity
  TestValidator.predicate(
    "last_activity_at updated after refresh",
    refreshedGuest.last_activity_at > originalLastActivity ||
      refreshedGuest.last_activity_at !== originalLastActivity,
  );
}
