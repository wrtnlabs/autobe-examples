import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_login_existing_account(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorCreateBody = {
    email: `${RandomGenerator.alphaNumeric(5)}@example.com`,
    password: `A1a!${RandomGenerator.alphaNumeric(5)}`,
    display_name: RandomGenerator.name(2),
  } satisfies IDiscussionBoardModerator.ICreate;

  const authorizedModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join.joinModerator(connection, {
      body: moderatorCreateBody,
    });
  typia.assert(authorizedModerator);

  TestValidator.predicate(
    "Moderator authorized contains valid access token",
    typeof authorizedModerator.token.access === "string" &&
      authorizedModerator.token.access.length > 0,
  );

  // Step 2: Login with the created account
  const loginBody = {
    email: moderatorCreateBody.email,
    password: moderatorCreateBody.password,
  } satisfies IDiscussionBoardModerator.ILogin;

  const loginResponse: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login.loginModerator(connection, {
      body: loginBody,
    });
  typia.assert(loginResponse);

  TestValidator.equals(
    "Moderator login email matches created email",
    loginResponse.email,
    moderatorCreateBody.email,
  );
  TestValidator.predicate(
    "Moderator login returns valid token",
    typeof loginResponse.token.access === "string" &&
      loginResponse.token.access.length > 0,
  );

  TestValidator.predicate(
    "Moderator login returns token expiration timestamps",
    typeof loginResponse.token.expired_at === "string" &&
      loginResponse.token.expired_at.length > 0 &&
      typeof loginResponse.token.refreshable_until === "string" &&
      loginResponse.token.refreshable_until.length > 0,
  );
}
