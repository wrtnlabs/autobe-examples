import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import type { IErpHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuestSession";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test temporal expiration analysis for guest sessions.
 *
 * This test validates filtering guest sessions by date range and expiration status,
 * enabling administrators to analyze visitor patterns and monitor session validity.
 */
export async function test_api_guest_session_temporal_expiration_analysis(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Test date range filtering
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.erpHrm.member.guest_sessions.index(memberConnection, {
      body: {
        from: oneDayAgo.toISOString(),
        to: oneHourAgo.toISOString(),
      } satisfies IErpHrmGuestSession.IRequest,
    });
  typia.assert(dateRangeResult);
  // 3. Verify all sessions have created_at within date range
  for (const session of dateRangeResult.data) {
    const createdAt = new Date(session.created_at);
    TestValidator.predicate(
      "session created_at within date range",
      createdAt >= oneDayAgo && createdAt <= oneHourAgo,
    );
  }
  // 4. Test expired=true filter
  const expiredResult = await api.functional.erpHrm.member.guest_sessions.index(
    memberConnection,
    {
      body: {
        expired: true,
      } satisfies IErpHrmGuestSession.IRequest,
    },
  );
  typia.assert(expiredResult);
  // 5. Verify all expired sessions have expired_at earlier than current time
  const currentTime = new Date();
  for (const session of expiredResult.data) {
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      "expired session has expired_at before current time",
      expiredAt < currentTime,
    );
  }
  // 6. Test expired=false filter for active sessions
  const activeResult = await api.functional.erpHrm.member.guest_sessions.index(
    memberConnection,
    {
      body: {
        expired: false,
      } satisfies IErpHrmGuestSession.IRequest,
    },
  );
  typia.assert(activeResult);
  // 7. Verify all active sessions have expired_at later than current time
  for (const session of activeResult.data) {
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      "active session has expired_at after current time",
      expiredAt >= currentTime,
    );
  }
  // 8. Test combined filters - date range with expiration status
  const combinedResult =
    await api.functional.erpHrm.member.guest_sessions.index(memberConnection, {
      body: {
        from: oneDayAgo.toISOString(),
        to: now.toISOString(),
        expired: false,
      } satisfies IErpHrmGuestSession.IRequest,
    });
  typia.assert(combinedResult);
  // Validate combined filter results
  const currentCheck = new Date();
  for (const session of combinedResult.data) {
    const createdAt = new Date(session.created_at);
    const expiredAt = new Date(session.expired_at);
    TestValidator.predicate(
      "combined filter: created_at in range",
      createdAt >= oneDayAgo && createdAt <= now,
    );
    TestValidator.predicate(
      "combined filter: session is active",
      expiredAt >= currentCheck,
    );
  }
}
