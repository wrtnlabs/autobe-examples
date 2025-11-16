import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_registered_user_login_with_existing_account(
  connection: api.IConnection,
) {
  // 1. Register a new user account with realistic email and URLs
  const joinBody = {
    typeName: "IRedditCommunityRegisteredUser.IJoin",
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // realistic password
    href: `https://${RandomGenerator.alphaNumeric(8)}.com/login`,
    referrer: `https://${RandomGenerator.alphaNumeric(8)}.com/home`,
    ip: null,
  } satisfies IRedditCommunityRegisteredUser.IJoin;

  const joinedUser = await api.functional.auth.registeredUser.join(connection, {
    body: joinBody,
  });
  typia.assert(joinedUser);

  TestValidator.predicate(
    "joined user has valid id",
    typeof joinedUser.id === "string" && joinedUser.id.length > 0,
  );
  TestValidator.predicate(
    "joined user has valid token access",
    typeof joinedUser.token.access === "string" &&
      joinedUser.token.access.length > 0,
  );

  // 2. Login using the registered user's email and password
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
    href: joinBody.href,
    referrer: joinBody.referrer,
    ip: null,
  } satisfies IRedditCommunityRegisteredUser.ILogin;

  const loggedInUser = await api.functional.auth.registeredUser.login(
    connection,
    { body: loginBody },
  );
  typia.assert(loggedInUser);

  // Validate logged in user id matches joined user id
  TestValidator.equals(
    "logged in user id matches joined user id",
    loggedInUser.id,
    joinedUser.id,
  );

  TestValidator.predicate(
    "logged in user has valid token access",
    typeof loggedInUser.token.access === "string" &&
      loggedInUser.token.access.length > 0,
  );
}
