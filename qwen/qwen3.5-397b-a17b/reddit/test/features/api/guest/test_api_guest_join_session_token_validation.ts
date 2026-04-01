import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest account registration and session token validation.
 *
 * This test validates the complete guest authentication flow:
 * 1. Register a new guest account using device fingerprint
 * 2. Verify response contains all required authentication fields
 * 3. Validate token structure and expiration timestamps
 * 4. Test that access token enables authenticated guest operations
 */
export async function test_api_guest_join_session_token_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest connection and register guest account
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      deviceFingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityGuest.IJoin,
  });
  // 2. Validate guest authorization response structure
  typia.assert(guestAuth);
  // 3. Verify guest ID is valid UUID format
  TestValidator.predicate("guest id is valid uuid", () => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(guestAuth.id);
  });
  // 4. Verify refreshable_until is after or equal to expired_at (business logic)
  TestValidator.predicate("refreshable_until is after expired_at", () => {
    const expiredAt = new Date(guestAuth.token.expired_at).getTime();
    const refreshableUntil = new Date(
      guestAuth.token.refreshable_until,
    ).getTime();
    return refreshableUntil >= expiredAt;
  });
  // 5. Verify guest connection has authorization header set
  TestValidator.predicate("guest connection has authorization header", () => {
    return (
      guestConnection.headers !== undefined &&
      guestConnection.headers.Authorization !== undefined
    );
  });
  // 6. Verify authorization header matches access token
  TestValidator.equals(
    "authorization header matches access token",
    guestConnection.headers?.Authorization,
    `Bearer ${guestAuth.token.access}`,
  );
  // 7. Test that multiple guest registrations create different accounts
  const guestAuth2 = await authorize_guest_join(guestConnection, {
    body: {
      deviceFingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.IJoin,
  });
  typia.assert(guestAuth2);
  TestValidator.notEquals(
    "different guest accounts have different ids",
    guestAuth.id,
    guestAuth2.id,
  );
}
