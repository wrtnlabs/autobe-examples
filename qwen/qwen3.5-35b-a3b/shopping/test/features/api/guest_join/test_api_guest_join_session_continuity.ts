import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_session_continuity(
  connection: api.IConnection,
): Promise<void> {
  // Generate consistent fingerprint for both join calls
  const fingerprint = RandomGenerator.alphaNumeric(32);
  // First join: Create new guest account
  const firstJoinBody = {
    fingerprint,
    href: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallGuest.IJoin;
  // Use authorize_guest_join utility function for first call
  const guestConnection: api.IConnection = { host: connection.host };
  const firstResult = await authorize_guest_join(guestConnection, {
    body: firstJoinBody,
  });
  typia.assert(firstResult);
  // Store first guest_id and token
  const firstGuestId = firstResult.id;
  const firstAccessToken = firstResult.token.access;
  const firstRefreshToken = firstResult.token.refresh;
  // Second join: Refresh existing guest session with different href
  const secondJoinBody = {
    fingerprint,
    href: typia.random<string & tags.Format<"uri">>(),
    ip: firstJoinBody.ip, // Same IP to maintain context
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallGuest.IJoin;
  // Use authorize_guest_join utility function for second call
  const guestRefreshConnection: api.IConnection = { host: connection.host };
  const secondResult = await authorize_guest_join(guestRefreshConnection, {
    body: secondJoinBody,
  });
  typia.assert(secondResult);
  // Validate session continuity
  TestValidator.equals(
    "guest_id consistent across join calls",
    secondResult.id,
    firstGuestId,
  );
  // Tokens should be regenerated on second call for security
  TestValidator.notEquals(
    "access token regenerated on second call",
    firstAccessToken,
    secondResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token regenerated on second call",
    firstRefreshToken,
    secondResult.token.refresh,
  );
  // Validate timestamp expiration is refreshed on second call
  const firstExpiredAt = new Date(firstResult.token.expired_at).getTime();
  const secondExpiredAt = new Date(secondResult.token.expired_at).getTime();
  TestValidator.predicate(
    "access token expiration refreshed on second call",
    secondExpiredAt > firstExpiredAt - 1000,
  );
  const firstRefreshableUntil = new Date(
    firstResult.token.refreshable_until,
  ).getTime();
  const secondRefreshableUntil = new Date(
    secondResult.token.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "refreshable_until deadline refreshed on second call",
    secondRefreshableUntil > firstRefreshableUntil - 1000,
  );
  // Validate guest_id is valid uuid format through typia type assertion
  typia.assert<string & tags.Format<"uuid">>(firstGuestId);
  typia.assert<string & tags.Format<"uuid">>(secondResult.id);
}
