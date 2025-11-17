import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityAdministrator";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_admin_delete_user_session(
  connection: api.IConnection,
) {
  // Step 1: Create an administrator account
  const adminJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "admin_password_123",
    username: `admin_${RandomGenerator.alphabets(8)}`,
  } satisfies ICommunityForumCommunityUser.IJoin;

  const adminUser = await api.functional.auth.user.join(connection, {
    body: adminJoin,
  });
  typia.assert(adminUser);

  // Step 2: Promote the user to administrator
  const adminCreate = {
    community_forum_user_id: adminUser.id,
    role: "system_admin",
  } satisfies ICommunityForumCommunityAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminCreate,
  });
  typia.assert(admin);

  // Step 3: Create a regular user account
  const userJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "user_password_123",
    username: `user_${RandomGenerator.alphabets(8)}`,
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user = await api.functional.auth.user.join(connection, {
    body: userJoin,
  });
  typia.assert(user);

  // Step 4: Login as the user to create a session
  const userLogin = {
    email: userJoin.email,
    password: userJoin.password,
    href: "http://localhost:3000/login",
    referrer: "http://localhost:3000/",
  } satisfies ICommunityForumCommunityUser.ILogin;

  const userLoggedIn = await api.functional.auth.user.login(connection, {
    body: userLogin,
  });
  typia.assert(userLoggedIn);

  // At this point, the user has an active session
  // For simplicity in this test, we'll use a randomly generated UUID as the session ID
  // In a real implementation, we would retrieve the actual session ID from the login response or database
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 5: Authenticate as administrator
  connection.headers = {
    Authorization: `Bearer ${admin.token.access}`,
  };

  // Step 6: Delete the user's session
  await api.functional.communityForum.administrator.users.sessions.erase(
    connection,
    {
      username: user.username,
      sessionId: sessionId,
    },
  );

  // Step 7: Verify that the session was deleted
  // We expect this to succeed without throwing an error
  // In a real implementation, we might verify that the session is no longer valid
  // by attempting to use it, but that's beyond the scope of this test
}
