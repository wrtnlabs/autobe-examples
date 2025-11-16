import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import type { IRedditCommunityRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUserSession";

export async function test_api_registered_user_session_deletion_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Registered user creation via join (public auth endpoint)
  const joinData = {
    typeName: "IRedditCommunityRegisteredUser.IJoin",
    email: typia.random<string & tags.Format<"email">>(),
    password: "strongPassword123",
    href: "https://reddit.example.com/login",
    referrer: "https://reddit.example.com/home",
  } satisfies IRedditCommunityRegisteredUser.IJoin;

  const authorizedUser = await api.functional.auth.registeredUser.join(
    connection,
    {
      body: joinData,
    },
  );
  typia.assert(authorizedUser);

  // Step 2: Create registered user account on reddit platform
  // Use email from joinData, username generated randomly
  const userCreateBody = {
    username: RandomGenerator.name(2).replace(/\s/g, "_"),
    email: joinData.email,
    password: joinData.password,
  } satisfies IRedditCommunityRegisteredUser.ICreate;
  const registeredUser =
    await api.functional.redditCommunity.redditCommunity.registeredUsers.create(
      connection,
      {
        body: userCreateBody,
      },
    );
  typia.assert(registeredUser);

  // Step 3: Create a session for the registered user (simulate active login)
  const sessionToken = RandomGenerator.alphaNumeric(24);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24).toISOString(); // 24 hours ahead

  const sessionCreateBody = {
    sessionToken,
    expiresAt,
    ipAddress: RandomGenerator.mobile("192."),
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) TestAgent",
    referer: "https://reddit.example.com/sessionStart",
  } satisfies IRedditCommunityRegisteredUserSession.ICreate;

  const userSession =
    await api.functional.redditCommunity.admin.redditCommunity.registeredUsers.registeredUserSessions.create(
      connection,
      {
        id: registeredUser.id,
        body: sessionCreateBody,
      },
    );
  typia.assert(userSession);

  // Step 4: Delete the session by session owner user
  await api.functional.redditCommunity.registeredUser.redditCommunity.registeredUsers.registeredUserSessions.erase(
    connection,
    {
      id: registeredUser.id,
      sessionId: userSession.id,
    },
  );

  // NOTE: As no direct API to read session by id is provided, assume the deletion
  // was successful if no error thrown during erase call. Additional validation
  // for unauthorized deletions is typically beyond scope or requires environment
  // setup beyond this test case.
}
