import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_session_token_generation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest connection and register
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  typia.assert(guest);
  // 2. Validate timestamps are valid dates
  const { token } = guest;
  const expiredAtDate = new Date(token.expired_at);
  const refreshableUntilDate = new Date(token.refreshable_until);
  // 3. Validate expired_at is in the future
  const now = new Date();
  TestValidator.predicate(
    "expired_at is in the future",
    expiredAtDate.getTime() > now.getTime(),
  );
  // 4. Validate refreshable_until is later than expired_at
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntilDate.getTime() > expiredAtDate.getTime(),
  );
  // 5. Validate token expiration times are reasonable
  const accessDurationMs = expiredAtDate.getTime() - now.getTime();
  const accessDurationMinutes = accessDurationMs / (1000 * 60);
  TestValidator.predicate(
    "access token duration is reasonable (15-60 min range)",
    accessDurationMinutes >= 10 && accessDurationMinutes <= 120,
  );
  const refreshDurationMs =
    refreshableUntilDate.getTime() - expiredAtDate.getTime();
  const refreshDurationDays = refreshDurationMs / (1000 * 60 * 60 * 24);
  TestValidator.predicate(
    "refresh token duration is reasonable (7-30 days range)",
    refreshDurationDays >= 1 && refreshDurationDays <= 60,
  );
  // 6. Validate guest connection has token set
  TestValidator.predicate(
    "guest connection has authorization header",
    guestConnection.headers?.Authorization !== undefined,
  );
  TestValidator.equals(
    "authorization header matches access token",
    guestConnection.headers?.Authorization,
    `Bearer ${token.access}`,
  );
}
