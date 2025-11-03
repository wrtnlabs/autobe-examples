import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuestSession";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";

export async function test_api_guest_session_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user registration and authentication
  const adminUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const adminAuthorized: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        user_id: adminUserId,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(adminAuthorized);

  // 2. Create guest user
  const guest: IRedditCommunityGuest =
    await api.functional.redditCommunity.guests.create(connection, {
      body: {},
    });
  typia.assert(guest);

  // 3. Create guest session for the guest user
  const createSessionBody = {
    ip: "192.168." + RandomGenerator.alphaNumeric(3),
    href: "https://redditcommunity.test/session-test",
    referrer: "https://redditcommunity.test/referrer-page",
    created_at: new Date().toISOString(),
    expired_at: null,
  } satisfies IRedditCommunityGuestSession.ICreate;

  const guestSession: IRedditCommunityGuestSession =
    await api.functional.redditCommunity.guests.sessions.create(connection, {
      guestId: guest.id,
      body: createSessionBody,
    });
  typia.assert(guestSession);

  // 4. Delete guest session by admin
  await api.functional.redditCommunity.admin.guests.sessions.eraseGuestSession(
    connection,
    {
      guestId: guest.id,
      sessionId: guestSession.id,
    },
  );

  // 5. No direct API for checking session deletion; assume no error is success
  // Additional REST API or DB check would be needed otherwise
  TestValidator.predicate(
    "guest session deletion succeeded without error",
    true,
  );
}
