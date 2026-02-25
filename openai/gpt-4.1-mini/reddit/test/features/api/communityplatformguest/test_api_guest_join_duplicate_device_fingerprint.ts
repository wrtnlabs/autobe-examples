import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_duplicate_device_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  // Create initial guest connection and join with a random device fingerprint
  const guestConnection1: api.IConnection = { host: connection.host };
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  const guest1 = await authorize_guest_join(guestConnection1, {
    body: { deviceFingerprint },
  });
  typia.assert(guest1);
  // Create second guest connection and join again with the SAME device fingerprint
  const guestConnection2: api.IConnection = { host: connection.host };
  const guest2 = await authorize_guest_join(guestConnection2, {
    body: { deviceFingerprint },
  });
  typia.assert(guest2);
  // Validate device fingerprint matches
  TestValidator.equals(
    "device fingerprint matches",
    guest2.deviceFingerprint,
    deviceFingerprint,
  );
  // Validate the access and refresh tokens are non-empty strings
  TestValidator.predicate("access token non-empty", guest2.access.length > 0);
  TestValidator.predicate("refresh token non-empty", guest2.refresh.length > 0);
  // Validate access and refresh expiration timestamps are valid ISO date-time strings
  const accessExpiredAt = new Date(guest2.accessExpiredAt);
  const refreshExpiredAt = new Date(guest2.refreshExpiredAt);
  TestValidator.predicate(
    "valid access token expiration date",
    !isNaN(accessExpiredAt.getTime()),
  );
  TestValidator.predicate(
    "valid refresh token expiration date",
    !isNaN(refreshExpiredAt.getTime()),
  );
  // Validate token property conforms to IAuthorizationToken structure
  typia.assert(guest2.token);
  typia.assert<string>(guest2.token.access);
  typia.assert<string>(guest2.token.refresh);
  typia.assert<string & tags.Format<"date-time">>(guest2.token.expired_at);
  typia.assert<string & tags.Format<"date-time">>(
    guest2.token.refreshable_until,
  );
}
