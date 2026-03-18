import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import type { IHrmPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest registration with a new device fingerprint.
 *
 * This test verifies the primary success path for guest registration when a
 * unique device fingerprint is encountered for the first time. It validates
 * that a new guest account is created, session tokens are issued, and all
 * metadata is properly captured.
 */
export async function test_api_guest_join_new_device_registration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate unique device fingerprint and session metadata
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // 2. Create guest-specific connection and register guest
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: href,
      referrer: referrer,
      ip: ip,
    } satisfies IHrmPlatformGuest.IJoin,
  });
  // 3. Validate response structure with typia
  typia.assert(authorized);
  // 4. Verify guest account details
  TestValidator.equals(
    "device fingerprint matches input",
    authorized.device_fingerprint,
    deviceFingerprint,
  );
  TestValidator.predicate(
    "created_at timestamp is set",
    authorized.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp is set",
    authorized.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null for new account",
    authorized.deleted_at,
    null,
  );
  // 5. Verify authorization token structure
  TestValidator.predicate(
    "access token is non-empty string",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at timestamp is set",
    authorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until timestamp is set",
    authorized.token.refreshable_until.length > 0,
  );
  // 6. Verify session records exist
  TestValidator.predicate(
    "at least one session created",
    authorized.sessions.length >= 1,
  );
  // 7. Validate first session details
  const session = authorized.sessions[0];
  if (session !== undefined) {
    TestValidator.equals(
      "session guest_id matches guest id",
      session.guest_id,
      authorized.id,
    );
    TestValidator.equals("session href matches input", session.href, href);
    TestValidator.equals(
      "session referrer matches input",
      session.referrer,
      referrer,
    );
    TestValidator.equals("session ip matches input", session.ip, ip);
    TestValidator.predicate(
      "session created_at is set",
      session.created_at.length > 0,
    );
    TestValidator.predicate(
      "session expired_at is set",
      session.expired_at.length > 0,
    );
  }
}
