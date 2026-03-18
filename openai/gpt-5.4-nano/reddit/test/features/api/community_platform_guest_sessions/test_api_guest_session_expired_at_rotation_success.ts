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

export async function test_api_guest_session_expired_at_rotation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Guest join to obtain guest identity/tokens
  const guestJoinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestJoinConnection, {
    body: {
      device_fingerprint: typia.random<string>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformGuest.IJoin,
  });
  typia.assert(authorized);
  // 2) Authenticated guest context for PATCH
  const guestConnection: api.IConnection = { host: connection.host };
  guestConnection.headers ??= {};
  guestConnection.headers.Authorization = authorized.token.access;
  const futureExpiredAt = typia
    .random<string & tags.Format<"date-time">>()
    .toString();
  // PATCH once (extend/rotate validity)
  const patch1 =
    await api.functional.communityPlatform.guest.sessions.updateSessions(
      guestConnection,
      {
        body: {
          id: authorized.id,
          expired_at: futureExpiredAt,
        } satisfies ICommunityPlatformGuestSession.IRequest,
      },
    );
  typia.assert(patch1);
  TestValidator.equals("session id unchanged", patch1.id, authorized.id);
  TestValidator.equals("deletedAt remains null", patch1.deletedAt, null);
  TestValidator.equals(
    "expiredAt equals requested future value",
    patch1.expiredAt,
    futureExpiredAt,
  );
  // PATCH again with no effective change
  const patch2 =
    await api.functional.communityPlatform.guest.sessions.updateSessions(
      guestConnection,
      {
        body: {
          id: authorized.id,
          expired_at: futureExpiredAt,
        } satisfies ICommunityPlatformGuestSession.IRequest,
      },
    );
  typia.assert(patch2);
  TestValidator.equals(
    "session id unchanged on second patch",
    patch2.id,
    authorized.id,
  );
  TestValidator.equals(
    "deletedAt remains null on second patch",
    patch2.deletedAt,
    null,
  );
  TestValidator.equals(
    "expiredAt remains consistent on second patch",
    patch2.expiredAt,
    futureExpiredAt,
  );
  // Note: without a prior session state read, we cannot reliably assert updatedAt refresh.
}
