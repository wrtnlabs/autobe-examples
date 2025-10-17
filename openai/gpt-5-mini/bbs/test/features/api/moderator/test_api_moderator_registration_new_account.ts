import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerator";

export async function test_api_moderator_registration_new_account(
  connection: api.IConnection,
) {
  /**
   * Purpose: Test successful moderator-capable account registration via POST
   * /auth/moderator/join.
   *
   * Steps:
   *
   * 1. Create a unique registration payload.
   * 2. Call the join endpoint and validate the returned authorization payload.
   * 3. Assert business-related token properties and id presence.
   * 4. Verify uniqueness constraint by attempting to re-register with the same
   *    username/email and expecting an error.
   *
   * Notes:
   *
   * - The environment must provide DB isolation between test runs. This test will
   *   not perform DB cleanup but expects CI to reset DB state.
   */

  // 1) Prepare unique registration payload
  const username = `mod_${RandomGenerator.alphaNumeric(8)}`;
  const email = typia.random<string & tags.Format<"email">>();
  const password = "P@ssw0rd-For-Tests-2025";
  const display_name = RandomGenerator.name();

  const createBody = {
    username,
    email,
    password,
    display_name,
  } satisfies IEconPoliticalForumModerator.ICreate;

  // 2) Call the join endpoint
  const authorized: IEconPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: createBody,
    });

  // 3) Validate response shape and business properties
  typia.assert(authorized);

  // Business validations using TestValidator
  TestValidator.predicate(
    "authorized object has non-empty id",
    () => typeof authorized.id === "string" && authorized.id.length > 0,
  );

  TestValidator.predicate(
    "access token exists",
    () =>
      typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token exists",
    () =>
      typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );

  // 4) Uniqueness: Attempt to register again with same username/email and expect an error.
  await TestValidator.error(
    "duplicate username/email should fail",
    async () => {
      // FIX: Ensure the internal API call is awaited so TestValidator.error catches the failure
      await api.functional.auth.moderator.join(connection, {
        body: createBody,
      });
    },
  );

  // NOTE: Further DB-level verifications (e.g., checking econ_political_forum_registereduser row)
  // are not implementable via the provided SDK. Such checks should be performed
  // by separate integration tests or direct DB queries in CI pipelines.
}
