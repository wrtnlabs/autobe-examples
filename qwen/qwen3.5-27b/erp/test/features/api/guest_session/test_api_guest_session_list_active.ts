import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import type { IHrmPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuestSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test retrieving a paginated list of active guest sessions.
 *
 * This test creates multiple guest sessions and validates that the session
 * listing endpoint correctly filters and returns only active sessions (those
 * with null expired_at). It verifies pagination metadata, session structure,
 * and sorting order.
 */
export async function test_api_guest_session_list_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create multiple guest sessions
  const guestSessions: IHrmPlatformGuest.IAuthorized[] = [];
  for (let i = 0; i < 3; i++) {
    const guestConnection: api.IConnection = { host: connection.host };
    const guestAuth = await authorize_guest_join(guestConnection, {
      body: {
        device_fingerprint: `guest-device-${i}-${RandomGenerator.alphaNumeric(16)}`,
        ip_address: typia.random<string & tags.Format<"ipv4">>(),
        user_agent: RandomGenerator.paragraph(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmPlatformGuest.IJoin,
    });
    typia.assert(guestAuth);
    guestSessions.push(guestAuth);
  }
  // 2. Execute: List active guest sessions
  const listConnection: api.IConnection = { host: connection.host };
  const sessionsList = await api.functional.hrmPlatform.guest.sessions.index(
    listConnection,
    {
      body: {
        status: "active",
        page: 1,
        limit: 20,
      } satisfies IHrmPlatformGuestSession.IRequest,
    },
  );
  typia.assert(sessionsList);
  // 3. Validate: Pagination metadata
  TestValidator.equals("current page is 1", sessionsList.pagination.current, 1);
  TestValidator.equals("limit is 20", sessionsList.pagination.limit, 20);
  TestValidator.predicate("has records", sessionsList.pagination.records >= 3);
  TestValidator.predicate(
    "pages calculated correctly",
    sessionsList.pagination.pages ===
      Math.ceil(
        sessionsList.pagination.records / sessionsList.pagination.limit,
      ),
  );
  // 4. Validate: All sessions are active (expired_at is null)
  for (const session of sessionsList.data) {
    typia.assert(session);
    // Verify session structure
    TestValidator.predicate(`session has valid id`, session.id.length > 0);
    TestValidator.predicate(`session has guest object`, session.guest !== null);
    TestValidator.predicate(`session has ip`, session.ip.length > 0);
    TestValidator.predicate(`session has href`, session.href.length > 0);
    TestValidator.predicate(
      `session has created_at`,
      session.created_at.length > 0,
    );
    // Verify active status (expired_at must be null)
    TestValidator.equals(
      `session ${session.id} is active`,
      session.expired_at,
      null,
    );
    // Verify guest object structure
    TestValidator.predicate(`guest has id`, session.guest.id.length > 0);
    TestValidator.predicate(
      `guest has device_fingerprint`,
      session.guest.device_fingerprint.length > 0,
    );
    TestValidator.predicate(
      `guest has ip_address`,
      session.guest.ip_address.length > 0,
    );
    TestValidator.predicate(
      `guest has created_at`,
      session.guest.created_at.length > 0,
    );
  }
  // 5. Validate: Sessions are sorted by created_at descending
  if (sessionsList.data.length > 1) {
    for (let i = 1; i < sessionsList.data.length; i++) {
      const prevSession = sessionsList.data[i - 1];
      const currSession = sessionsList.data[i];
      TestValidator.predicate(
        `session ${i - 1} created before session ${i}`,
        new Date(prevSession.created_at).getTime() >=
          new Date(currSession.created_at).getTime(),
      );
    }
  }
}
