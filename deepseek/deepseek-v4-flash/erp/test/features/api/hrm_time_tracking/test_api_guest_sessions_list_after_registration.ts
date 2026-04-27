import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuest";
import type { IHrmTimeTrackingGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuestSession";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_sessions_list_after_registration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new guest account
  const guestConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const joinResult = await authorize_guest_join(guestConnection, {
    body: { email },
  });
  typia.assert(joinResult);
  // 2. List sessions with default parameters (no filters)
  const firstPage = await api.functional.hrmTimeTracking.guest.sessions.index(
    guestConnection,
    { body: {} satisfies IHrmTimeTrackingMemberSession.IRequest },
  );
  typia.assert(firstPage);
  // 3. Verify data array is not empty
  TestValidator.predicate(
    "has at least one session after registration",
    firstPage.data.length >= 1,
  );
  // 4. Verify session fields
  const session = firstPage.data[0]!;
  typia.assert(session);
  TestValidator.equals(
    "session member email matches registration email",
    session.member.email,
    email,
  );
  // 5. Verify session validity timestamps
  const createdAt = new Date(session.created_at).getTime();
  const expiredAt = new Date(session.expired_at).getTime();
  TestValidator.predicate(
    "expired_at is after created_at",
    expiredAt > createdAt,
  );
  // 6. Call second time and verify consistency
  const secondPage = await api.functional.hrmTimeTracking.guest.sessions.index(
    guestConnection,
    { body: {} satisfies IHrmTimeTrackingMemberSession.IRequest },
  );
  typia.assert(secondPage);
  TestValidator.equals(
    "session count remains consistent between list calls",
    secondPage.data.length,
    firstPage.data.length,
  );
  // 7. Verify no expired sessions are returned (only active sessions)
  const now = Date.now();
  for (const s of firstPage.data) {
    TestValidator.predicate(
      `session ${s.id} has future expiration`,
      new Date(s.expired_at).getTime() > now,
    );
  }
}
