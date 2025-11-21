import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";

export async function test_api_guest_refresh_security_context(
  connection: api.IConnection,
) {
  // Step 1: Create initial guest session with comprehensive session data
  const originalSessionId = RandomGenerator.alphaNumeric(32);
  const originalUserAgent = `Mozilla/5.0 ${RandomGenerator.name()} ${RandomGenerator.alphaNumeric(8)}/${RandomGenerator.alphaNumeric(4)}`;
  const originalIp = typia.random<string & tags.Format<"ipv4">>();
  const currentTimestamp = new Date();
  const originalTimestamp = currentTimestamp.toISOString();
  const randomUrl = `https://example${RandomGenerator.alphaNumeric(4)}.com/products/${RandomGenerator.alphaNumeric(6)}`;
  const referrerUrl = `https://search${RandomGenerator.alphaNumeric(3)}.com/results?q=${RandomGenerator.name()}`;

  const guestCreateData = {
    session_id: originalSessionId,
    user_agent: originalUserAgent,
    ip: originalIp,
    href: randomUrl,
    referrer: referrerUrl,
    last_activity_at: originalTimestamp,
    created_at: originalTimestamp,
    updated_at: originalTimestamp,
  } satisfies IShoppingMallGuest.ICreate;

  const originalGuest = await api.functional.auth.guest.join(connection, {
    body: guestCreateData,
  });
  typia.assert(originalGuest);

  TestValidator.predicate(
    "guest ID should be valid UUID",
    typia.is<string & tags.Format<"uuid">>(originalGuest.id),
  );

  TestValidator.equals(
    "session ID should match original",
    originalGuest.session_id,
    originalSessionId,
  );

  TestValidator.equals(
    "IP address should match original",
    originalGuest.ip_address,
    originalIp,
  );

  TestValidator.equals(
    "user agent should match original",
    originalGuest.user_agent,
    originalUserAgent,
  );

  // Step 2: Test successful refresh with same session
  const refreshData = {
    session_id: originalSessionId,
  } satisfies IShoppingMallGuest.IRefresh;

  const refreshedGuest = await api.functional.auth.guest.refresh(connection, {
    body: refreshData,
  });
  typia.assert(refreshedGuest);

  // Step 3: Validate security context preservation
  TestValidator.equals(
    "refreshed ID should be same as original",
    refreshedGuest.id,
    originalGuest.id,
  );

  TestValidator.equals(
    "session ID should remain consistent after refresh",
    refreshedGuest.session_id,
    originalSessionId,
  );

  TestValidator.equals(
    "IP address should be preserved during refresh",
    refreshedGuest.ip_address,
    originalGuest.ip_address,
  );

  TestValidator.equals(
    "user agent should be preserved during refresh",
    refreshedGuest.user_agent,
    originalGuest.user_agent,
  );

  // Step 4: Validate token renewal
  TestValidator.predicate(
    "access token should be different after refresh",
    refreshedGuest.token.access !== originalGuest.token.access,
  );

  TestValidator.predicate(
    "refresh token should be different after refresh",
    refreshedGuest.token.refresh !== originalGuest.token.refresh,
  );

  // Step 5: Validate token structure
  TestValidator.predicate(
    "access token should be present",
    refreshedGuest.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token should be present",
    refreshedGuest.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "expired_at should be valid date-time format",
    typia.is<string & tags.Format<"date-time">>(
      refreshedGuest.token.expired_at,
    ),
  );

  TestValidator.predicate(
    "refreshable_until should be valid date-time format",
    typia.is<string & tags.Format<"date-time">>(
      refreshedGuest.token.refreshable_until,
    ),
  );

  // Step 6: Validate last activity tracking
  TestValidator.predicate(
    "last_activity_at should be updated after refresh",
    refreshedGuest.last_activity_at !== originalGuest.last_activity_at,
  );

  // Step 7: Test with invalid session
  const invalidSessionId = RandomGenerator.alphaNumeric(32);
  const invalidRefreshData = {
    session_id: invalidSessionId,
  } satisfies IShoppingMallGuest.IRefresh;

  await TestValidator.error(
    "refresh should fail with invalid session",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: invalidRefreshData,
      });
    },
  );
}
