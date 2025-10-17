import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalModerator";

export async function test_api_moderator_login_success_existing(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * - Create a moderator account via POST /auth/moderator/join
   * - Login using the same credentials via POST /auth/moderator/login
   * - Validate returned authorized profile and token container
   * - Validate invalid credentials are rejected
   *
   * Notes:
   *
   * - Use only provided SDK functions and DTO types
   * - Use `satisfies` for request bodies and typia.assert for responses
   */

  // 1) Prepare randomized moderator credentials
  const username: string = RandomGenerator.alphaNumeric(8);
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(12);
  const display_name: string = RandomGenerator.name();

  // 2) Create moderator account (join)
  const createBody = {
    username,
    email,
    password,
    display_name,
  } satisfies ICommunityPortalModerator.ICreate;

  const created: ICommunityPortalModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: createBody,
    });
  // Full structural validation
  typia.assert(created);

  // Business checks on created response
  TestValidator.predicate(
    "created response contains token.access",
    !!created.token &&
      typeof created.token.access === "string" &&
      created.token.access.length > 0,
  );

  // Ensure sensitive fields are not leaked
  TestValidator.predicate(
    "created response does not leak password_hash",
    !("password_hash" in (created as unknown as Record<string, unknown>)),
  );

  // 3) Login with same credentials
  const loginBody = {
    identifier: username,
    password,
  } satisfies ICommunityPortalModerator.ILogin;

  const logged: ICommunityPortalModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginBody,
    });
  typia.assert(logged);

  // Validate returned profile matches created username
  TestValidator.equals(
    "login returns same username",
    logged.username,
    username,
  );

  // Validate token presence on login
  TestValidator.predicate(
    "login response contains token.access",
    !!logged.token &&
      typeof logged.token.access === "string" &&
      logged.token.access.length > 0,
  );

  // 4) Negative test: invalid credentials should cause an error
  await TestValidator.error("invalid credentials should fail", async () => {
    await api.functional.auth.moderator.login(connection, {
      body: {
        identifier: username,
        password: "incorrect-password",
      } satisfies ICommunityPortalModerator.ILogin,
    });
  });
}
