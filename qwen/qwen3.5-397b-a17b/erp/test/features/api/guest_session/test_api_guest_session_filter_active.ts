import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import type { IHrmPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuestSession";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_filter_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as guest to establish session context
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. Create future timestamp for filtering active sessions (1 hour from now)
  const futureTimestamp = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  // 3. Call PATCH /hrmPlatform/guest/sessions with expired_at filter
  const sessionResponse = await api.functional.hrmPlatform.guest.sessions.index(
    guestConnection,
    {
      body: {
        expired_at: futureTimestamp,
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformMemberSession.IRequest,
    },
  );
  typia.assert(sessionResponse);
  // 4. Validate pagination structure
  TestValidator.equals(
    "current page matches request",
    sessionResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit is within valid range",
    sessionResponse.pagination.limit > 0 &&
      sessionResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count is non-negative",
    sessionResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    sessionResponse.pagination.pages >= 0,
  );
  // 5. Validate all returned sessions have expired_at in the future (active sessions)
  const currentTime = new Date().getTime();
  for (const session of sessionResponse.data) {
    const expiredAt = new Date(session.expired_at).getTime();
    TestValidator.predicate(
      `session ${session.id} expired_at is in future (active session)`,
      expiredAt > currentTime,
    );
  }
}
