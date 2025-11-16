import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_registered_user_login_existing(
  connection: api.IConnection,
) {
  // Generate realistic user data for join
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12); // 12-char alphanumeric password
  const href = `https://reddit.example.com/login`; // realistic href of login page
  const referrer = `https://reddit.example.com/home`; // realistic referrer

  // Join operation to create new user account
  const joined: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        typeName: "IRedditCommunityRegisteredUser.IJoin",
        email: email,
        password: password,
        href: href,
        referrer: referrer,
        ip: null,
      } satisfies IRedditCommunityRegisteredUser.IJoin,
    });
  typia.assert(joined);

  // Verify joined user email matches request
  TestValidator.equals("joined user email", joined.email, email);
  TestValidator.predicate(
    "joined user token access exists",
    !!joined.token.access,
  );
  TestValidator.predicate(
    "joined user token refresh exists",
    !!joined.token.refresh,
  );

  // Login operation to authenticate existing user
  const loggedIn: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.login(connection, {
      body: {
        email: email,
        password: password,
        href: href,
        referrer: referrer,
        ip: null,
      } satisfies IRedditCommunityRegisteredUser.ILogin,
    });
  typia.assert(loggedIn);

  // Verify logged in user email matches
  TestValidator.equals("logged in user email", loggedIn.email, email);
  TestValidator.predicate(
    "logged in user token access exists",
    !!loggedIn.token.access,
  );
  TestValidator.predicate(
    "logged in user token refresh exists",
    !!loggedIn.token.refresh,
  );
}
