import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_user_session_deletion(
  connection: api.IConnection,
) {
  // Create first test user
  const user1Join = {
    email: "test1@example.com",
    password: "password123",
    username: "testuser1",
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user1: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: user1Join,
    });
  typia.assert(user1);

  // Create second test user
  const user2Join = {
    email: "test2@example.com",
    password: "password123",
    username: "testuser2",
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user2: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: user2Join,
    });
  typia.assert(user2);

  // Login as first user to create sessions
  const user1Login = {
    email: user1Join.email,
    password: user1Join.password,
    href: "http://localhost:3000/login",
    referrer: "http://localhost:3000/",
  } satisfies ICommunityForumCommunityUser.ILogin;

  const user1Session1: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: user1Login,
    });
  typia.assert(user1Session1);

  // Create another session for user1
  const user1Session2: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: user1Login,
    });
  typia.assert(user1Session2);

  // Test unauthorized access (without proper authentication)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "should not allow unauthorized session deletion",
    async () => {
      await api.functional.communityForum.user.users.sessions.erase(
        unauthConnection,
        {
          username: user1.username,
          sessionId: user1Session1.token.access,
        },
      );
    },
  );

  // Test deletion of non-existent session
  await TestValidator.error(
    "should not allow deleting non-existent session",
    async () => {
      await api.functional.communityForum.user.users.sessions.erase(
        connection,
        {
          username: user1.username,
          sessionId: "00000000-0000-0000-0000-000000000000", // Non-existent UUID
        },
      );
    },
  );
}
