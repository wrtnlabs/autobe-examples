import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_registered_user_login_existing_account(
  connection: api.IConnection,
) {
  // 1. Create a registered user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);

  const user: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies IRedditCommunityRegisteredUser.ICreate,
    });
  typia.assert(user);

  // 2. Authenticate with correct credentials
  const login: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.login(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: "https://example.com/homepage",
        referrer: "https://google.com",
      } satisfies IRedditCommunityRegisteredUser.ILogin,
    });
  typia.assert(login);

  TestValidator.predicate(
    "login token access length is positive",
    login.token.access.length > 0,
  );
  TestValidator.predicate(
    "login token refresh length is positive",
    login.token.refresh.length > 0,
  );

  // 3. Attempt login with incorrect password and expect failure
  await TestValidator.error("login fails with incorrect password", async () => {
    await api.functional.auth.registeredUser.login(connection, {
      body: {
        email: userEmail,
        password: "wrong_password123",
        href: "https://example.com/homepage",
        referrer: "https://google.com",
      } satisfies IRedditCommunityRegisteredUser.ILogin,
    });
  });

  // 4. Attempt login with incorrect email and expect failure
  await TestValidator.error("login fails with incorrect email", async () => {
    await api.functional.auth.registeredUser.login(connection, {
      body: {
        email: "not_existing_user@example.com",
        password: userPassword,
        href: "https://example.com/homepage",
        referrer: "https://google.com",
      } satisfies IRedditCommunityRegisteredUser.ILogin,
    });
  });
}
