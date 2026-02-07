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

export async function test_api_guest_session_refresh(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest account with initial session
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {} satisfies ICommunityPlatformGuest.IJoin,
  });
  // 2. Get initial session
  const initialSession =
    await api.functional.communityPlatform.guest.guest.sessions.index(
      guestConnection,
      {
        body: {} satisfies ICommunityPlatformGuestSession.IRequest,
      },
    );
  typia.assert(initialSession);
  // Store initial expiration time for comparison
  const initialExpiredAt = new Date(initialSession.expired_at);
  // 3. Refresh guest session (same device fingerprint)
  const refreshedSession =
    await api.functional.communityPlatform.guest.guest.sessions.index(
      guestConnection,
      {
        body: {} satisfies ICommunityPlatformGuestSession.IRequest,
      },
    );
  typia.assert(refreshedSession);
  // 4. Validate expiration time has been updated by 1 hour
  const refreshedExpiredAt = new Date(refreshedSession.expired_at);
  const hour = 60 * 60 * 1000;
  const timeDifference =
    refreshedExpiredAt.getTime() - initialExpiredAt.getTime();
  TestValidator.predicate(
    "Session expiration extended by at least 1 hour",
    timeDifference >= hour,
  );
}
