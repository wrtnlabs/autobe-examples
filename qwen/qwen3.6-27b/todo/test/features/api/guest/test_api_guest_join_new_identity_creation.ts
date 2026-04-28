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
 * Verify new guest identity creation and authorization with unique device fingerprint.
 *
 * A first-time unregistered visitor provides a unique device_fingerprint along with session context (href, referrer, ip) to register as a new guest. The backend creates both a guest identity record and a session record, returning the guest UUID and JWT authorization token pair.
 *
 * Validates that the response contains a valid UUID for the new guest identity and a complete authorization token with access token, refresh token, and properly ordered expiration timestamps.
 *
 * Special attention is given to verifying token expiration logic: the access token expiration (expired_at) must be in the future, and the session-wide expiration (refreshable_until) must be greater than or equal to the access token expiration.
 *
 * 1. Create isolated guest connection from base connection.
 * 2. Join as guest with unique device_fingerprint, href, referrer, and ip.
 * 3. Validate response structure via typia.assert().
 * 4. Verify token strings are non-empty.
 * 5. Verify token timestamps are in the future and properly ordered.
 */
export async function test_api_guest_join_new_identity_creation(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const deviceId = `guest-device-${RandomGenerator.alphaNumeric(16)}`;
  const now = new Date();
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: deviceId,
      href: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(authorized);
  TestValidator.predicate("has non-empty guest UUID", authorized.id.length > 0);
  TestValidator.predicate(
    "access token is non-empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    authorized.token.refresh.length > 0,
  );
  const expiredAt = new Date(authorized.token.expired_at);
  const refreshableUntil = new Date(authorized.token.refreshable_until);
  const nowTs = now.getTime();
  const expiredAtTs = expiredAt.getTime();
  const refreshableUntilTs = refreshableUntil.getTime();
  TestValidator.predicate(
    "access token expired_at is in the future",
    expiredAtTs > nowTs,
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableUntilTs > nowTs,
  );
  TestValidator.predicate(
    "refreshable_until >= expired_at (session outlives access token)",
    refreshableUntilTs >= expiredAtTs,
  );
}
