import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuestSession";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";

export async function test_api_admin_update_guest_session(
  connection: api.IConnection,
) {
  // 1. Admin joins the system to authenticate
  const adminAuth: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        user_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(adminAuth);

  // 2. Create a guest user
  const guest: IRedditCommunityGuest =
    await api.functional.redditCommunity.guests.create(connection, {
      body: {},
    });
  typia.assert(guest);

  // 3. Create a session for the guest user
  const now = new Date();
  const createdAt = now.toISOString();
  const expiredAt = new Date(now.getTime() + 1000 * 60 * 60).toISOString();

  const guestSessionCreate: IRedditCommunityGuestSession.ICreate = {
    ip: RandomGenerator.pick(["127.0.0.1", "192.168.1.1", "10.0.0.1"]),
    href: `https://reddit.com/r/${RandomGenerator.name(1).replace(/ /g, "")}`,
    referrer: `https://google.com/search?q=${RandomGenerator.name(3).replace(/ /g, "+")}`,
    created_at: createdAt,
    expired_at: expiredAt,
  } satisfies IRedditCommunityGuestSession.ICreate;

  const session: IRedditCommunityGuestSession =
    await api.functional.redditCommunity.guests.sessions.create(connection, {
      guestId: guest.id,
      body: guestSessionCreate,
    });
  typia.assert(session);

  // 4. Update the guest session metadata as admin
  //    Since the updateGuestSession function accepts only guestId and sessionId,
  //    and no request body, we assume the update means a renewal or refresh operation.
  //    So typically, the test just calls update with guestId and sessionId parameters.

  await api.functional.redditCommunity.admin.guests.sessions.updateGuestSession(
    connection,
    {
      guestId: guest.id,
      sessionId: session.id,
    },
  );

  // 5. No explicit return from update, so no further assertions possible
}
