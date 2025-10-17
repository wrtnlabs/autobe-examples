import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalModerator";

/**
 * Validate moderator login rejection with invalid credentials.
 *
 * Business context:
 *
 * - Moderators are onboarded via /auth/moderator/join and authenticate via
 *   /auth/moderator/login. Authentication must not grant tokens for invalid
 *   credentials, and error responses must not leak whether an identifier
 *   exists.
 *
 * Test steps:
 *
 * 1. Create a moderator account using a unique username and email.
 * 2. Attempt to login with the correct identifier but an incorrect password,
 *    expecting the call to fail (an error is thrown).
 * 3. Sanity-check: login with correct credentials succeeds and returns tokens.
 */
export async function test_api_moderator_login_invalid_credentials(
  connection: api.IConnection,
) {
  // 1. Prepare credentials and create moderator
  const username = RandomGenerator.alphaNumeric(8);
  const email = typia.random<string & tags.Format<"email">>();
  const password = "CorrectPassword123!";

  const createBody = {
    username,
    email,
    password,
    display_name: RandomGenerator.name(),
    avatar_uri: null,
  } satisfies ICommunityPortalModerator.ICreate;

  const created: ICommunityPortalModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: createBody,
    });
  // Full type validation
  typia.assert(created);
  TestValidator.equals(
    "created moderator username matches",
    created.username,
    username,
  );

  // 2. Attempt login with incorrect password - must throw
  const invalidLogin = {
    identifier: username,
    password: "WrongPassword!",
  } satisfies ICommunityPortalModerator.ILogin;

  await TestValidator.error(
    "login with incorrect password should be rejected",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: invalidLogin,
      });
    },
  );

  // 3. Sanity-check: correct login still succeeds
  const validLogin = {
    identifier: username,
    password,
  } satisfies ICommunityPortalModerator.ILogin;

  const authorized: ICommunityPortalModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: validLogin,
    });
  typia.assert(authorized);

  // Ensure token exists and username matches
  TestValidator.predicate(
    "successful login returns non-empty access token",
    typeof authorized.token?.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.equals(
    "authorized username matches",
    authorized.username,
    username,
  );
}
