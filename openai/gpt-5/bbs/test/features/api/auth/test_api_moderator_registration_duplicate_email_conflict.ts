import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussModerator";

export async function test_api_moderator_registration_duplicate_email_conflict(
  connection: api.IConnection,
) {
  /**
   * Validate moderator registration and duplicate email conflict behavior.
   *
   * Steps:
   *
   * 1. Register a moderator with unique email/password/display_name and optional
   *    locale/timezone
   * 2. Assert authorized session response and core business expectations
   * 3. Attempt to register again with the same email from an unauthenticated
   *    cloned connection
   * 4. Expect an error for duplicate email (without asserting specific HTTP status
   *    codes)
   */
  // --- 1) Register moderator (happy path) ---
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = RandomGenerator.alphaNumeric(12); // >= 8 chars
  const displayName: string = RandomGenerator.name(1); // 1 word (3-7 chars by default)
  const locale: string = "en-US";
  const timezone: string = "Asia/Seoul";

  const created: IEconDiscussModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email,
        password,
        display_name: displayName,
        locale,
        timezone,
      } satisfies IEconDiscussModerator.ICreate,
    });
  typia.assert(created);

  // --- 2) Business validations (no extra type validation beyond typia.assert) ---
  TestValidator.predicate(
    "access token must be non-empty string",
    created.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token must be non-empty string",
    created.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "role is either undefined or 'moderator'",
    created.role === undefined || created.role === "moderator",
  );
  TestValidator.predicate(
    "timezone in response is either null/undefined or matches the input",
    created.timezone === undefined ||
      created.timezone === null ||
      created.timezone === timezone,
  );
  TestValidator.predicate(
    "locale in response is either null/undefined or matches the input",
    created.locale === undefined ||
      created.locale === null ||
      created.locale === locale,
  );

  // --- 3) Duplicate email registration attempt (unauthenticated cloned connection) ---
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // --- 4) Expect error on duplicate email (no status code assertions) ---
  await TestValidator.error(
    "duplicate email registration must fail",
    async () => {
      await api.functional.auth.moderator.join(unauthConn, {
        body: {
          email, // same email triggers business uniqueness rule
          password: RandomGenerator.alphaNumeric(12),
          display_name: RandomGenerator.name(1),
          locale,
          timezone,
        } satisfies IEconDiscussModerator.ICreate,
      });
    },
  );
}
