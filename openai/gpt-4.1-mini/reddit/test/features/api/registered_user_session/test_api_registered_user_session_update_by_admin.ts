import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import type { IRedditCommunityRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUserSession";

export async function test_api_registered_user_session_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user joins and authenticates
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPassword123!",
  } satisfies IRedditCommunityAdmin.ICreate;
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminBody });
  typia.assert(admin);

  // 2. Create a registered user account
  const userBody = {
    username: RandomGenerator.name(1).toLowerCase().replace(/\s+/g, "_"),
    email: typia.random<string & tags.Format<"email">>(),
    password: "UserPass123!",
  } satisfies IRedditCommunityRegisteredUser.ICreate;
  const user =
    await api.functional.redditCommunity.redditCommunity.registeredUsers.create(
      connection,
      { body: userBody },
    );
  typia.assert(user);

  // 3. Create a registered user session for the user
  const sessionBody = {
    sessionToken: RandomGenerator.alphaNumeric(32),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // expire in 1 day
    ipAddress: "192.168.1.100",
    userAgent: "Mozilla/5.0 (compatible; TestBrowser/1.0)",
    referer: "https://redditcommunity.test",
  } satisfies IRedditCommunityRegisteredUserSession.ICreate;
  const session =
    await api.functional.redditCommunity.admin.redditCommunity.registeredUsers.registeredUserSessions.create(
      connection,
      {
        id: user.id,
        body: sessionBody,
      },
    );
  typia.assert(session);

  // 4. Update the registered user session via admin update session API
  const updateBody = {
    sessionToken: RandomGenerator.alphaNumeric(32),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(), // expire in 2 days
    ipAddress: "10.0.0.2",
    userAgent: "Mozilla/5.0 (compatible; UpdatedTestBrowser/2.0)",
    referer: "https://redditcommunity-updated.test",
    isActive: true,
  } satisfies IRedditCommunityRegisteredUserSession.IUpdate;

  const updatedSession =
    await api.functional.redditCommunity.admin.redditCommunity.registeredUsers.registeredUserSessions.update(
      connection,
      {
        id: user.id,
        sessionId: session.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSession);

  // 5. Validate that updated fields match the update body
  TestValidator.equals(
    "sessionToken should be updated",
    updatedSession.token,
    updateBody.sessionToken!,
  );
  TestValidator.equals(
    "expiresAt should be updated",
    updatedSession.expires_at,
    updateBody.expiresAt!,
  );
  TestValidator.equals(
    "ipAddress should be updated",
    updatedSession.ip,
    updateBody.ipAddress!,
  );
  TestValidator.equals(
    "userAgent should be updated",
    updatedSession.user_agent,
    updateBody.userAgent!,
  );
  TestValidator.equals(
    "referer should be updated",
    updatedSession.referrer,
    updateBody.referer!,
  );
  TestValidator.equals(
    "isActive flag should be updated",
    updatedSession.is_active,
    updateBody.isActive!,
  );
}
