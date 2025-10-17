import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerator";

/**
 * Validate moderator login failure with invalid credentials.
 *
 * Business context and purpose:
 *
 * - Ensure that POST /auth/moderator/login fails when incorrect credentials are
 *   supplied. This test validates observable API behavior only (error on
 *   invalid credentials), because direct database fields
 *   (failed_login_attempts, locked_until) are not available via the provided
 *   SDK. The test verifies that invalid attempts throw and that repeated
 *   invalid attempts continue to throw (idempotent failure behavior).
 *
 * Steps:
 *
 * 1. Register a new moderator-capable account using the join endpoint.
 * 2. Attempt login with wrong password and assert the call throws (await
 *    TestValidator.error).
 * 3. Repeat the invalid login with a different wrong password and assert it also
 *    throws.
 *
 * Rationale for design decisions:
 *
 * - We do NOT assert specific HTTP status codes (forbidden by test policy).
 * - We do NOT inspect or mutate connection.headers (forbidden); the SDK may set
 *   headers internally but tests must not read or change them.
 * - We cannot verify server-side counters directly because no read API is
 *   provided; therefore we validate observable behavior only.
 */
export async function test_api_moderator_login_invalid_credentials(
  connection: api.IConnection,
) {
  // 1) Create moderator-capable user
  const password = "StrongP@ssw0rd!";
  const createBody = {
    username: `mod_${RandomGenerator.alphaNumeric(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password,
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumModerator.ICreate;

  const authorized: IEconPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: createBody,
    });
  typia.assert(authorized);

  // 2) First invalid login attempt: expect an error (do NOT assert status code)
  await TestValidator.error("invalid credentials should fail", async () => {
    await api.functional.auth.moderator.login(connection, {
      body: {
        usernameOrEmail: createBody.username,
        password: "WrongPassword1",
      } satisfies IEconPoliticalForumModerator.ILogin,
    });
  });

  // 3) Second invalid login attempt: expect an error again (idempotent failure)
  await TestValidator.error(
    "second invalid credentials attempt should also fail",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: {
          usernameOrEmail: createBody.email,
          password: "WrongPassword2",
        } satisfies IEconPoliticalForumModerator.ILogin,
      });
    },
  );

  // Cleanup: No deletion API provided. Test environment must provide isolation
  // (database transaction rollback, separate schema, or ephemeral DB) to avoid
  // leftover accounts.
}
