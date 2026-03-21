import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test successful guest session refresh using a valid refresh token obtained from prior guest join.
 *
 * Steps:
 * 1. Call POST /ecommerceMall/auth/guest/join to create a new guest identity and obtain access/refresh token pair
 * 2. Extract the refresh token from the response
 * 3. Call POST /ecommerceMall/auth/guest/refresh with the refresh token in the request body
 * 4. Validate response returns new access_token and refresh_token different from the original
 * 5. Verify new tokens are valid format (JWT structure for access, UUID for refresh)
 * 6. Verify response includes expired_at and refreshable_until timestamps
 *
 * This validates the core token refresh lifecycle for guest sessions.
 */
export async function test_api_guest_session_refresh_with_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new guest identity and obtain access/refresh token pair
  const guestConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_guest_join(guestConnection, {
    body: {
      fingerprint: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      user_agent: RandomGenerator.name(),
    },
  });
  typia.assert(initialAuth);
  // Step 2: Extract the original refresh token
  const originalRefreshToken = initialAuth.token.refresh;
  const originalAccessToken = initialAuth.token.access;
  // Step 3: Call POST /ecommerceMall/auth/guest/refresh with the refresh token
  const refreshedConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_guest_refresh(refreshedConnection, {
    body: {
      refreshToken: originalRefreshToken,
    },
  });
  typia.assert(refreshedAuth);
  // Step 4: Validate response returns new access_token and refresh_token different from the original
  TestValidator.notEquals(
    "new access token differs from original",
    refreshedAuth.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token differs from original",
    refreshedAuth.token.refresh,
    originalRefreshToken,
  );
  // Step 5: Verify new tokens are valid format (JWT structure for access, UUID for refresh)
  // JWT format: header.payload.signature (three base64url-encoded parts separated by dots)
  const jwtParts = refreshedAuth.token.access.split(".");
  TestValidator.equals("access token is valid JWT format", jwtParts.length, 3);
  // Refresh token should be UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  TestValidator.predicate(
    "refresh token is valid UUID format",
    uuidRegex.test(refreshedAuth.token.refresh),
  );
  // Step 6: Verify response includes expired_at and refreshable_until timestamps
  TestValidator.predicate(
    "expired_at is valid ISO date-time format",
    !isNaN(Date.parse(refreshedAuth.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO date-time format",
    !isNaN(Date.parse(refreshedAuth.token.refreshable_until)),
  );
  // Verify expired_at is in the future
  const expiredAtDate = new Date(refreshedAuth.token.expired_at);
  const now = new Date();
  TestValidator.predicate("expired_at is in the future", expiredAtDate > now);
  // Verify refreshable_until is after expired_at
  const refreshableUntilDate = new Date(refreshedAuth.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntilDate > expiredAtDate,
  );
}
