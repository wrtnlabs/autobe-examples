import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_update_rejected_when_session_already_expired(
  connection: api.IConnection,
): Promise<void> {
  const guestJoinConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    device_fingerprint: typia.random<string>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformGuest.IJoin;
  const authorized = await authorize_guest_join(guestJoinConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  const guestConnection: api.IConnection = { host: connection.host };
  guestConnection.headers ??= {};
  guestConnection.headers.Authorization = authorized.token.access;
  const pastExpiredAt1 = new Date(Date.now() - 60000).toISOString();
  const expiredSession1 =
    await api.functional.communityPlatform.guest.sessions.updateSessions(
      guestConnection,
      {
        body: {
          id: authorized.id,
          expired_at: pastExpiredAt1,
        } satisfies ICommunityPlatformGuestSession.IRequest,
      },
    );
  typia.assert(expiredSession1);
  const pastExpiredAt1Ms = Date.parse(expiredSession1.expiredAt);
  TestValidator.predicate(
    "expiredAt should be in the past",
    pastExpiredAt1Ms < Date.now(),
  );
  const pastExpiredAt2 = new Date(Date.now() - 30000).toISOString();
  const expiredSession2 =
    await api.functional.communityPlatform.guest.sessions.updateSessions(
      guestConnection,
      {
        body: {
          id: authorized.id,
          expired_at: pastExpiredAt2,
        } satisfies ICommunityPlatformGuestSession.IRequest,
      },
    );
  typia.assert(expiredSession2);
  TestValidator.equals(
    "session id unchanged",
    expiredSession2.id,
    expiredSession1.id,
  );
  TestValidator.equals(
    "expiredAt remains unchanged after second patch",
    expiredSession2.expiredAt,
    expiredSession1.expiredAt,
  );
  TestValidator.equals(
    "deletedAt stays null after second patch",
    expiredSession2.deletedAt,
    null,
  );
}
