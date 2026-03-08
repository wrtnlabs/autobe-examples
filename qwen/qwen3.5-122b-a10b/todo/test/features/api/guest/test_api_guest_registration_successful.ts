import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test successful guest registration via device fingerprint.
 *
 * This test verifies the complete guest registration workflow:
 * 1. Generate unique device fingerprint and session context
 * 2. Register guest account via POST /todoApp/auth/guest/join
 * 3. Verify response contains valid guest id and authorization tokens
 * 4. Validate all token fields are properly formatted
 * 5. Verify guest account creation with correct metadata
 */
export async function test_api_guest_registration_successful(
  connection: api.IConnection,
): Promise<void> {
  // Create guest-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate unique device fingerprint for this test
  const deviceFingerprint =
    `guest_device_${typia.random<string & tags.Format<"uuid">>()}` satisfies string &
      tags.MinLength<1>;
  // Generate valid URI formats for href and referrer
  const href =
    `https://example.com/todo?session=${typia.random<string & tags.Format<"uuid">>()}` satisfies string &
      tags.Format<"uri">;
  const referrer = `https://example.com/landing` satisfies string &
    tags.Format<"uri">;
  // Generate optional IPv4 address
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // Register guest account using utility function
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: href,
      referrer: referrer,
      ip: ip,
    } satisfies ITodoAppGuest.IJoin,
  });
  // Validate response structure with typia
  typia.assert(authorized);
  // Verify guest id is valid UUID format
  TestValidator.equals(
    "guest id is UUID",
    true,
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );
  // Verify token structure - all fields must exist and have valid values
  TestValidator.predicate(
    "access token exists",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      authorized.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until is valid datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      authorized.token.refreshable_until,
    ),
  );
  // Verify expired_at is in the future
  TestValidator.predicate(
    "expired_at is in future",
    new Date(authorized.token.expired_at).getTime() > Date.now(),
  );
  // Verify refreshable_until is after expired_at
  TestValidator.predicate(
    "refreshable_until after expired_at",
    new Date(authorized.token.refreshable_until).getTime() >=
      new Date(authorized.token.expired_at).getTime(),
  );
  // Verify guest connection has authorization header set by utility function
  TestValidator.predicate(
    "connection has authorization header",
    guestConnection.headers?.Authorization !== undefined,
  );
}
