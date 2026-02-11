import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_with_valid_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare valid device fingerprint (64-character hexadecimal)
  const fingerprint: string = Array.from({ length: 64 }, () =>
    RandomGenerator.pick([
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
    ]),
  ).join("");
  // 2. Create guest connection and register
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: fingerprint,
    } satisfies IRedditPlatformGuest.IJoin,
  });
  typia.assert(authorized);
  // 3. Validate response structure
  TestValidator.predicate(
    "has valid UUID",
    typia.is<string & tags.Format<"uuid">>(authorized.id),
  );
  TestValidator.predicate(
    "has access token",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
  // 4. Validate token expiration
  const accessExpiresAt = new Date(authorized.token.expired_at);
  const refreshableUntil = new Date(authorized.token.refreshable_until);
  const now = new Date();
  // Access token should expire within 60 minutes (3600000ms)
  const timeUntilAccessExpires = accessExpiresAt.getTime() - now.getTime();
  TestValidator.predicate(
    "access token expires within 60 minutes",
    timeUntilAccessExpires > 0 && timeUntilAccessExpires <= 60 * 60 * 1000,
  );
  // Refresh token should be valid for up to 30 days (2592000000ms)
  const timeUntilRefreshableUntil = refreshableUntil.getTime() - now.getTime();
  TestValidator.predicate(
    "refresh token valid for up to 30 days",
    timeUntilRefreshableUntil > 0 &&
      timeUntilRefreshableUntil <= 30 * 24 * 60 * 60 * 1000,
  );
  // 5. Verify connection headers were updated
  TestValidator.notEquals(
    "Authorization header set",
    guestConnection.headers?.Authorization,
    undefined,
  );
  TestValidator.equals(
    "Authorization header matches access token",
    guestConnection.headers?.Authorization,
    `Bearer ${authorized.token.access}`,
  );
}
