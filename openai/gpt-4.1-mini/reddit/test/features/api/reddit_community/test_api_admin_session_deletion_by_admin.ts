import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import type { IRedditCommunityRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUserSession";

export async function test_api_admin_session_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin user
  const adminCreateBody = {
    email: `admin.${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "Admin1234!",
  } satisfies IRedditCommunityAdmin.ICreate;
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Create a registered user
  const userCreateBody = {
    username: `user_${RandomGenerator.alphaNumeric(8)}`,
    email: `user.${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "User1234!",
  } satisfies IRedditCommunityRegisteredUser.ICreate;
  const user: IRedditCommunityRegisteredUser =
    await api.functional.redditCommunity.redditCommunity.registeredUsers.create(
      connection,
      {
        body: userCreateBody,
      },
    );
  typia.assert(user);

  // 3. Admin creates a session for the registered user
  const sessionCreateBody = {
    sessionToken: RandomGenerator.alphaNumeric(24),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    referer: "https://admin.example.com/session-start",
    ipAddress: null,
    userAgent: null,
  } satisfies IRedditCommunityRegisteredUserSession.ICreate;

  const session: IRedditCommunityRegisteredUserSession =
    await api.functional.redditCommunity.admin.redditCommunity.registeredUsers.registeredUserSessions.create(
      connection,
      {
        id: user.id,
        body: sessionCreateBody,
      },
    );
  typia.assert(session);

  // 4. Admin deletes the created session
  await api.functional.redditCommunity.admin.redditCommunity.registeredUsers.registeredUserSessions.erase(
    connection,
    {
      id: user.id,
      sessionId: session.id,
    },
  );
}
