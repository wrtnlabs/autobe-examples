import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_user_login_valid_credentials(
  connection: api.IConnection,
) {
  // First, create a user account for testing
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    username: RandomGenerator.name(1).toLowerCase().replace(/\s+/g, "_"),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: joinInput,
    });
  typia.assert(user);

  // Now test login with valid credentials
  const loginInput = {
    email: joinInput.email,
    password: joinInput.password,
    href: "http://localhost:3000/login",
    referrer: "http://localhost:3000/",
  } satisfies ICommunityForumCommunityUser.ILogin;

  const loginResult: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: loginInput,
    });
  typia.assert(loginResult);

  // Validate that we get the same user back
  TestValidator.equals(
    "login returns correct user ID",
    loginResult.id,
    user.id,
  );

  TestValidator.equals(
    "login returns correct email",
    loginResult.email,
    joinInput.email,
  );

  TestValidator.equals(
    "login returns correct username",
    loginResult.username,
    joinInput.username,
  );

  // Validate that we get authentication tokens
  TestValidator.predicate(
    "access token is provided",
    () => loginResult.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token is provided",
    () => loginResult.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "access token expiration is in the future",
    () => new Date(loginResult.token.expired_at) > new Date(),
  );

  TestValidator.predicate(
    "refresh token expiration is in the future",
    () => new Date(loginResult.token.refreshable_until) > new Date(),
  );
}
