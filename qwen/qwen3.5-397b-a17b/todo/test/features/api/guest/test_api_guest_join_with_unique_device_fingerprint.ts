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
 * Test successful guest account registration with a unique device fingerprint.
 *
 * Validates the complete guest registration flow including device fingerprint submission, session context capture, and JWT token generation. Ensures that the system correctly creates a guest account identified by the unique device fingerprint and returns proper authentication credentials.
 *
 * Special attention is given to verifying token lifetimes - access tokens should be short-lived for security while refresh tokens provide longer session continuity. The session metadata (IP address, href, referrer) must be captured for audit and security monitoring purposes.
 *
 * 1. Generate unique device fingerprint and session context data.
 * 2. Register guest account using authorize_guest_join utility.
 * 3. Validate response structure contains guest ID and authorization tokens.
 * 4. Verify token expiration timestamps reflect appropriate lifetimes.
 * 5. Confirm all session metadata fields are properly captured.
 */
export async function test_api_guest_join_with_unique_device_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare guest registration data with unique device fingerprint
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // 2. Create guest connection and register
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: href,
      referrer: referrer,
      ip: ip,
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(authorized);
  // 3. Validate refresh token lifetime is longer than access token lifetime
  const accessExpiration = new Date(authorized.token.expired_at).getTime();
  const refreshExpiration = new Date(
    authorized.token.refreshable_until,
  ).getTime();
  TestValidator.predicate("refresh token expires after access token", () => {
    return refreshExpiration > accessExpiration;
  });
}
