import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_login_success(
  connection: api.IConnection,
) {
  // 1. Register a new moderator user
  const email = typia.random<string & tags.Format<"email">>();
  const password = "ComplexPass123!";
  const display_name = RandomGenerator.name();

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join.joinModerator(connection, {
      body: {
        email,
        password,
        display_name,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Attempt to login with valid credentials
  const loginRequestBody = {
    email,
    password,
  } satisfies IDiscussionBoardModerator.ILogin;

  const loginResult: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login.loginModerator(connection, {
      body: loginRequestBody,
    });
  typia.assert(loginResult);

  // 3. Confirm tokens exist and are non-empty strings
  TestValidator.predicate(
    "loginResult.token.access is a non-empty string",
    typeof loginResult.token.access === "string" &&
      loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "loginResult.token.refresh is a non-empty string",
    typeof loginResult.token.refresh === "string" &&
      loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "loginResult.id matches registered moderator id",
    loginResult.id === moderator.id,
  );

  // 4. Check that tokens contain valid ISO date strings for expiration
  TestValidator.predicate(
    "token.expired_at is a valid ISO date string",
    typeof loginResult.token.expired_at === "string" &&
      !isNaN(Date.parse(loginResult.token.expired_at)),
  );
  TestValidator.predicate(
    "token.refreshable_until is a valid ISO date string",
    typeof loginResult.token.refreshable_until === "string" &&
      !isNaN(Date.parse(loginResult.token.refreshable_until)),
  );

  // 5. Negative test: login with invalid password error
  await TestValidator.error("login with incorrect password fails", async () => {
    await api.functional.auth.moderator.login.loginModerator(connection, {
      body: {
        email,
        password: "WrongPassword123!",
      } satisfies IDiscussionBoardModerator.ILogin,
    });
  });

  // 6. Negative test: login with non-existent email error
  await TestValidator.error("login with non-existent email fails", async () => {
    await api.functional.auth.moderator.login.loginModerator(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password,
      } satisfies IDiscussionBoardModerator.ILogin,
    });
  });
}
