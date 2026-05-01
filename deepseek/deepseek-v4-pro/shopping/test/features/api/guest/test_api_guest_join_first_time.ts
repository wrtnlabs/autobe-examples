import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test first-time guest visitor registration via device fingerprint.
 *
 * Validates the complete IShoppingMallGuest.IAuthorized response returned when a never-before-seen device fingerprint registers on the platform. The test explicitly crafts unique session context fields (device_fingerprint, ip, href, referrer) so that every field in the response can be traced back to the input, ensuring full input-output correspondence.
 *
 * Special attention is given to verifying that exactly one session is created with matching audit metadata, that all timestamps are anchored to the current moment (created_at, updated_at, session created_at and expired_at), that deleted_at is null for active guests, and that the IAuthorizationToken contains valid JWT tokens with correct expiration windows — the access token expiring within approximately 15 minutes and the refresh token remaining valid for approximately 24 hours.
 *
 * 1. Generate unique device_fingerprint and session context (ip, href, referrer).
 * 2. Call authorize_guest_join with the crafted body on an isolated connection.
 * 3. typia.assert validates the entire response type structure.
 * 4. Verify device_fingerprint is preserved in the response.
 * 5. Verify exactly one session exists with matching ip, href, referrer.
 * 6. Verify session timestamps: created_at is recent, expired_at is in the future.
 * 7. Verify guest timestamps: created_at/updated_at are recent, deleted_at is null.
 * 8. Verify IAuthorizationToken: access token expires within ~15 min, refresh token valid for ~24 hours.
 */
export async function test_api_guest_join_first_time(
  connection: api.IConnection,
): Promise<void> {
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const guestConnection: api.IConnection = { host: connection.host };
  const output = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      ip,
      href,
      referrer,
    },
  });
  typia.assert(output);
  TestValidator.equals(
    "device fingerprint preserved",
    output.device_fingerprint,
    deviceFingerprint,
  );
  TestValidator.equals(
    "exactly one session created",
    output.sessions.length,
    1,
  );
  const session = output.sessions[0]!;
  TestValidator.equals("session ip matches", session.ip, ip);
  TestValidator.equals("session href matches", session.href, href);
  TestValidator.equals("session referrer matches", session.referrer, referrer);
  const now = new Date();
  TestValidator.predicate(
    "session created_at is recent",
    () =>
      Math.abs(new Date(session.created_at).getTime() - now.getTime()) < 60000,
  );
  TestValidator.predicate(
    "session expired_at is in the future",
    () => new Date(session.expired_at).getTime() > now.getTime(),
  );
  TestValidator.equals("deleted_at is null", output.deleted_at, null);
  TestValidator.predicate(
    "guest created_at is recent",
    () =>
      Math.abs(new Date(output.created_at).getTime() - now.getTime()) < 60000,
  );
  TestValidator.predicate(
    "guest updated_at is recent",
    () =>
      Math.abs(new Date(output.updated_at).getTime() - now.getTime()) < 60000,
  );
  TestValidator.predicate("access token expires within ~15 minutes", () => {
    const diff = new Date(output.token.expired_at).getTime() - now.getTime();
    return diff > 0 && diff < 20 * 60 * 1000;
  });
  TestValidator.predicate("refresh token valid for ~24 hours", () => {
    const diff =
      new Date(output.token.refreshable_until).getTime() - now.getTime();
    return diff > 23 * 60 * 60 * 1000 && diff < 25 * 60 * 60 * 1000;
  });
}
