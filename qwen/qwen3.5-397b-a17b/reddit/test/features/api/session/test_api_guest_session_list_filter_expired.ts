import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMemberSession";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest session filtering by expiration status.
 *
 * Validates the session list endpoint's ability to filter sessions based on their expiration status. Creates a guest session, then retrieves sessions with the expired filter set to false to verify only active sessions are returned, and with expired filter set to true to verify expired sessions are filtered correctly.
 *
 * The test ensures that the filtering mechanism correctly identifies sessions based on the expired_at timestamp compared to the current time. Active sessions (expired_at in the future) should be returned when expired=false, while expired sessions (expired_at in the past) should be returned when expired=true.
 *
 * 1. Guest joins to create authentication context and session.
 * 2. Retrieve sessions with expired=false filter to get active sessions.
 * 3. Retrieve sessions with expired=true filter to get expired sessions.
 * 4. Validate response structure and filtering logic consistency.
 * 5. Verify active sessions have expired_at in the future.
 * 6. Verify expired sessions have expired_at in the past.
 */
export async function test_api_guest_session_list_filter_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session for authentication
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      deviceFingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityGuest.IJoin,
  });
  typia.assert(guest);
  // 2. Retrieve active sessions (expired=false)
  const activeSessions =
    await api.functional.redditCommunity.guest.sessions.index(guestConnection, {
      body: {
        expired: false,
      } satisfies IRedditCommunityMemberSession.IRequest,
    });
  typia.assert(activeSessions);
  // 3. Retrieve expired sessions (expired=true)
  const expiredSessions =
    await api.functional.redditCommunity.guest.sessions.index(guestConnection, {
      body: {
        expired: true,
      } satisfies IRedditCommunityMemberSession.IRequest,
    });
  typia.assert(expiredSessions);
  // 4. Validate response structure
  TestValidator.predicate(
    "pagination exists",
    activeSessions.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(activeSessions.data),
  );
  TestValidator.predicate(
    "expired pagination exists",
    expiredSessions.pagination !== undefined,
  );
  TestValidator.predicate(
    "expired data array exists",
    Array.isArray(expiredSessions.data),
  );
  // 5. Validate filtering logic - active sessions should have expired_at in the future
  const now = new Date().toISOString();
  for (const session of activeSessions.data) {
    TestValidator.predicate(
      `session ${session.id} should be active`,
      new Date(session.expired_at) >= new Date(now),
    );
  }
  // 6. Validate filtering logic - expired sessions should have expired_at in the past
  for (const session of expiredSessions.data) {
    TestValidator.predicate(
      `session ${session.id} should be expired`,
      new Date(session.expired_at) < new Date(now),
    );
  }
}
