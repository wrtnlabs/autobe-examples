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

export async function test_api_guest_join_new_device(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a fresh guest connection
  const guestConnection: api.IConnection = { host: connection.host };
  // 2. Generate unique device fingerprint and request data
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  const href = typia.random<string & tags.Format<"uri">>();
  // 3. Call the utility function for POST /todoApp/auth/guest/join
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: href,
      referrer: null,
    },
  });
  // 4. Validate the response structure
  typia.assert(authorized);
  // 5. Verify device_fingerprint matches what was sent
  TestValidator.equals(
    "device_fingerprint matches request",
    authorized.device_fingerprint,
    deviceFingerprint,
  );
  // 6. Verify access token is non-empty
  TestValidator.predicate(
    "access token is non-empty",
    authorized.token.access.length > 0,
  );
  // 7. Verify refresh token is non-empty
  TestValidator.predicate(
    "refresh token is non-empty",
    authorized.token.refresh.length > 0,
  );
  // 8. Verify expired_at is in the future
  const now = new Date();
  const expiredAt = new Date(authorized.token.expired_at);
  TestValidator.predicate("expired_at is in the future", expiredAt > now);
  // 9. Verify refreshable_until is further in the future than expired_at
  const refreshableUntil = new Date(authorized.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is further in the future than expired_at",
    refreshableUntil > expiredAt,
  );
}
