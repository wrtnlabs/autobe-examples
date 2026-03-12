import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorSession";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest session filtering by status and actor type.
 *
 * This test verifies that a guest can filter session data by:
 * - Session status (active/expired)
 * - Actor type (member/administrator/guest)
 * - Combined filters
 *
 * Steps:
 * 1. Authenticate as guest
 * 2. Filter sessions by status='active'
 * 3. Filter sessions by status='expired'
 * 4. Filter sessions by actor_type='member'
 * 5. Filter sessions by actor_type='administrator'
 * 6. Filter sessions by actor_type='guest'
 * 7. Filter sessions with combined criteria (status + actor_type)
 * 8. Validate that returned sessions match filter criteria
 */
export async function test_api_guest_session_filter_by_status_and_actor_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as guest
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  // 2. Filter sessions by status='active'
  const activeSessions =
    await api.functional.discussionBoard.guest.sessions.index(guestConnection, {
      body: {
        status: "active",
      } satisfies IDiscussionBoardAdministratorSession.IRequest,
    });
  typia.assert(activeSessions);
  // Validate all returned sessions are active (expired_at is null)
  for (const session of activeSessions.data) {
    TestValidator.equals(
      "active session has null expired_at",
      session.expired_at,
      null,
    );
  }
  // 3. Filter sessions by status='expired'
  const expiredSessions =
    await api.functional.discussionBoard.guest.sessions.index(guestConnection, {
      body: {
        status: "expired",
      } satisfies IDiscussionBoardAdministratorSession.IRequest,
    });
  typia.assert(expiredSessions);
  // Validate all returned sessions are expired (expired_at is not null)
  for (const session of expiredSessions.data) {
    TestValidator.predicate(
      "expired session has non-null expired_at",
      session.expired_at !== null,
    );
  }
  // 4. Filter sessions by actor_type='member'
  const memberSessions =
    await api.functional.discussionBoard.guest.sessions.index(guestConnection, {
      body: {
        actor_type: "member",
      } satisfies IDiscussionBoardAdministratorSession.IRequest,
    });
  typia.assert(memberSessions);
  // Validate all returned sessions have actor_type='member'
  for (const session of memberSessions.data) {
    TestValidator.equals(
      "member session has correct actor_type",
      session.actor_type,
      "member",
    );
  }
  // 5. Filter sessions by actor_type='administrator'
  const adminSessions =
    await api.functional.discussionBoard.guest.sessions.index(guestConnection, {
      body: {
        actor_type: "administrator",
      } satisfies IDiscussionBoardAdministratorSession.IRequest,
    });
  typia.assert(adminSessions);
  // Validate all returned sessions have actor_type='administrator'
  for (const session of adminSessions.data) {
    TestValidator.equals(
      "admin session has correct actor_type",
      session.actor_type,
      "administrator",
    );
  }
  // 6. Filter sessions by actor_type='guest'
  const guestSessions =
    await api.functional.discussionBoard.guest.sessions.index(guestConnection, {
      body: {
        actor_type: "guest",
      } satisfies IDiscussionBoardAdministratorSession.IRequest,
    });
  typia.assert(guestSessions);
  // Validate all returned sessions have actor_type='guest'
  for (const session of guestSessions.data) {
    TestValidator.equals(
      "guest session has correct actor_type",
      session.actor_type,
      "guest",
    );
  }
  // 7. Filter sessions with combined criteria (status='active' AND actor_type='member')
  const activeMemberSessions =
    await api.functional.discussionBoard.guest.sessions.index(guestConnection, {
      body: {
        status: "active",
        actor_type: "member",
      } satisfies IDiscussionBoardAdministratorSession.IRequest,
    });
  typia.assert(activeMemberSessions);
  // Validate all returned sessions match both criteria
  for (const session of activeMemberSessions.data) {
    TestValidator.equals(
      "combined filter: session is active",
      session.expired_at,
      null,
    );
    TestValidator.equals(
      "combined filter: session is member",
      session.actor_type,
      "member",
    );
  }
  // 8. Filter sessions with combined criteria (status='expired' AND actor_type='guest')
  const expiredGuestSessions =
    await api.functional.discussionBoard.guest.sessions.index(guestConnection, {
      body: {
        status: "expired",
        actor_type: "guest",
      } satisfies IDiscussionBoardAdministratorSession.IRequest,
    });
  typia.assert(expiredGuestSessions);
  // Validate all returned sessions match both criteria
  for (const session of expiredGuestSessions.data) {
    TestValidator.predicate(
      "combined filter: session is expired",
      session.expired_at !== null,
    );
    TestValidator.equals(
      "combined filter: session is guest",
      session.actor_type,
      "guest",
    );
  }
}
