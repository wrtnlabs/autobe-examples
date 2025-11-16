import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import type { IRedditCommunityRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUserSession";

export async function test_api_registered_user_session_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registers a new admin user account via /auth/admin/join
  const adminCreate: IRedditCommunityAdmin.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPassw0rd!",
  };
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreate,
    });
  typia.assert(admin);

  // 2. Create a new registered user
  const registeredUserCreate: IRedditCommunityRegisteredUser.ICreate = {
    username: `user_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "UserPass123!",
  };
  const registeredUser: IRedditCommunityRegisteredUser =
    await api.functional.redditCommunity.redditCommunity.registeredUsers.create(
      connection,
      {
        body: registeredUserCreate,
      },
    );
  typia.assert(registeredUser);

  // 3. Create a session for the registered user
  const sessionCreate: IRedditCommunityRegisteredUserSession.ICreate = {
    sessionToken: RandomGenerator.alphaNumeric(32),
    expiresAt: new Date(Date.now() + 86400000).toISOString(), // 1 day later
    ipAddress: "192.168.1.100",
    userAgent: "Mozilla/5.0 (compatible; E2E-Test)",
    referer: "https://reddit.example.com/",
  };
  const session: IRedditCommunityRegisteredUserSession =
    await api.functional.redditCommunity.admin.redditCommunity.registeredUsers.registeredUserSessions.create(
      connection,
      {
        id: registeredUser.id,
        body: sessionCreate,
      },
    );
  typia.assert(session);

  // 4. Admin retrieves the session details
  const retrievedSession: IRedditCommunityRegisteredUserSession =
    await api.functional.redditCommunity.admin.redditCommunity.registeredUsers.registeredUserSessions.at(
      connection,
      {
        id: registeredUser.id,
        sessionId: session.id,
      },
    );
  typia.assert(retrievedSession);

  // 5. Validate the retrieved session matches the created session
  TestValidator.equals("Session ID matches", retrievedSession.id, session.id);
  TestValidator.equals(
    "User ID matches",
    retrievedSession.user_id,
    registeredUser.id,
  );
  TestValidator.equals(
    "Session token matches",
    retrievedSession.token,
    sessionCreate.sessionToken,
  );
  TestValidator.equals(
    "Expiry date matches",
    retrievedSession.expires_at,
    sessionCreate.expiresAt,
  );
  TestValidator.equals(
    "IP address matches",
    retrievedSession.ip,
    sessionCreate.ipAddress,
  );
  TestValidator.equals(
    "User agent matches",
    retrievedSession.user_agent,
    sessionCreate.userAgent,
  );
  TestValidator.equals(
    "Referrer matches",
    retrievedSession.referrer,
    sessionCreate.referer,
  );
  TestValidator.equals("Session is active", retrievedSession.is_active, true);
}
