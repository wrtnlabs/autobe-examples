import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_login_success(connection: api.IConnection) {
  // 1. Create a new user account with the /auth/user/join API
  const email = `user_${typia.random<string & tags.Format<"email">>()}`;
  const password = "Password123!";
  const joinRequestBody = {
    email: email,
    password: password,
    ip: null,
    href: "https://test.example.com/join",
    referrer: "https://referrer.example.com/",
  } satisfies ITodoListUser.ICreate;

  const joinedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: joinRequestBody,
    });
  typia.assert(joinedUser);

  // 2. Attempt to login with correct credentials
  const loginRequestBody = {
    email: email,
    password: password,
    ip: null,
    href: "https://test.example.com/login",
    referrer: "https://referrer.example.com/",
  } satisfies ITodoListUser.ILogin;

  const loggedInUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: loginRequestBody,
    });
  typia.assert(loggedInUser);

  // Validate that the ID is a valid UUID string
  TestValidator.predicate(
    "logged-in user ID is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      loggedInUser.id,
    ),
  );

  // Validate that JWT tokens exist and have string values
  TestValidator.predicate(
    "access token is a non-empty string",
    typeof loggedInUser.token.access === "string" &&
      loggedInUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is a non-empty string",
    typeof loggedInUser.token.refresh === "string" &&
      loggedInUser.token.refresh.length > 0,
  );

  // Validate ISO date format for expiration fields
  TestValidator.predicate(
    "expired_at format is ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/.test(
      loggedInUser.token.expired_at,
    ),
  );

  TestValidator.predicate(
    "refreshable_until format is ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/.test(
      loggedInUser.token.refreshable_until,
    ),
  );
}
