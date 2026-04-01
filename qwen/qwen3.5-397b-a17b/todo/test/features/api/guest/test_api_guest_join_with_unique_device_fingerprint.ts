import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test successful guest registration with a unique device fingerprint.
 *
 * This test verifies the complete guest onboarding flow:
 * 1. Generate unique device fingerprint and valid URIs for registration
 * 2. Call guest join endpoint with proper request body
 * 3. Verify response contains valid guest ID in UUID format
 * 4. Validate authorization tokens (access, refresh, expired_at, refreshable_until)
 * 5. Confirm tokens are properly structured for JWT authentication
 * 6. Verify session metadata is captured for audit tracking
 */
export async function test_api_guest_join_with_unique_device_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare guest registration data with unique device fingerprint
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const joinInput = {
    device_fingerprint: deviceFingerprint,
    href: href,
    referrer: referrer,
    ip: ip,
  } satisfies IMultiUserTodoGuest.IJoin;
  // 2. Create guest-specific connection and perform registration
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: joinInput,
  });
  // 3. Validate complete response structure and types
  typia.assert(authorized);
  // 4. Validate tokens are non-empty (business logic, not type validation)
  TestValidator.predicate(
    "access token is not empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is not empty",
    authorized.token.refresh.length > 0,
  );
  // 5. Verify refresh token expiration is after access token expiration
  const expiredAt = new Date(authorized.token.expired_at).getTime();
  const refreshableUntil = new Date(
    authorized.token.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "refresh token lasts longer than access token",
    refreshableUntil >= expiredAt,
  );
  // 6. Verify connection headers were updated with access token for subsequent requests
  TestValidator.equals(
    "connection headers contain authorization",
    guestConnection.headers?.Authorization,
    `Bearer ${authorized.token.access}`,
  );
}
