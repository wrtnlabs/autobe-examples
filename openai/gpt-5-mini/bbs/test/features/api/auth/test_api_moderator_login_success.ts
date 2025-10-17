import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerator";

export async function test_api_moderator_login_success(
  connection: api.IConnection,
) {
  /**
   * Test plan:
   *
   * 1. Create a new moderator-capable registered user via POST
   *    /auth/moderator/join
   * 2. Perform login via POST /auth/moderator/login using the created credentials
   * 3. Validate returned IEconPoliticalForumModerator.IAuthorized shapes and token
   *    semantics
   *
   * Notes:
   *
   * - Use only provided DTO types and the 'satisfies' operator for request bodies
   * - Do NOT access or modify connection.headers directly
   * - Typia.assert() is used to validate response types
   */

  // 1) Prepare test credentials
  const moderatorPassword: string = RandomGenerator.alphaNumeric(12);
  const moderatorUsername: string = `mod_${RandomGenerator.alphaNumeric(8)}`;
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorDisplayName: string = RandomGenerator.name();

  // 2) Create moderator-capable registered user
  const created: IEconPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: moderatorUsername,
        email: moderatorEmail,
        password: moderatorPassword,
        display_name: moderatorDisplayName,
      } satisfies IEconPoliticalForumModerator.ICreate,
    });
  // Validate shape
  typia.assert(created);

  // Basic assertions on created payload
  TestValidator.predicate(
    "created.id is a non-empty string",
    typeof created.id === "string" && created.id.length > 0,
  );
  TestValidator.predicate(
    "created.token.access is non-empty",
    typeof created.token.access === "string" && created.token.access.length > 0,
  );

  // 3) Login with the newly created credentials using username
  const loginByUsername: IEconPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        usernameOrEmail: moderatorUsername,
        password: moderatorPassword,
      } satisfies IEconPoliticalForumModerator.ILogin,
    });
  typia.assert(loginByUsername);

  // 4) Validate login payload
  TestValidator.equals(
    "login id matches created id",
    loginByUsername.id,
    created.id,
  );

  TestValidator.predicate(
    "login token.access is non-empty",
    typeof loginByUsername.token.access === "string" &&
      loginByUsername.token.access.length > 0,
  );
  TestValidator.predicate(
    "login token.refresh is non-empty",
    typeof loginByUsername.token.refresh === "string" &&
      loginByUsername.token.refresh.length > 0,
  );

  // JWT-like format check (three segments separated by '.')
  TestValidator.predicate(
    "access token looks like JWT (3 segments)",
    loginByUsername.token.access.split(".").length === 3,
  );

  // expired_at and refreshable_until should be valid ISO datetimes in the future
  const now = Date.now();
  const expiredAt = new Date(loginByUsername.token.expired_at).getTime();
  const refreshableUntil = new Date(
    loginByUsername.token.refreshable_until,
  ).getTime();

  TestValidator.predicate(
    "token.expired_at is a valid future datetime",
    !Number.isNaN(expiredAt) && expiredAt > now,
  );
  TestValidator.predicate(
    "token.refreshable_until is a valid future datetime",
    !Number.isNaN(refreshableUntil) && refreshableUntil > now,
  );

  // 5) Additional: attempt login using email as usernameOrEmail to ensure alternate identifier works
  const loginByEmail: IEconPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        usernameOrEmail: moderatorEmail,
        password: moderatorPassword,
      } satisfies IEconPoliticalForumModerator.ILogin,
    });
  typia.assert(loginByEmail);
  TestValidator.equals(
    "login by email id matches created id",
    loginByEmail.id,
    created.id,
  );

  // NOTE: Server-side session row inspection, last_login_at, and failed_login_attempts
  // cannot be validated here because the provided SDK does not offer database
  // inspection endpoints. Such checks must be performed by integration tests
  // with DB access or via dedicated admin APIs not provided in this test.
}
