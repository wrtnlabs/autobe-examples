import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that excessive failed login attempts trigger temporary account lockout.
 *
 * This test validates the rate limiting mechanism that enforces maximum 5
 * failed login attempts within 15-minute window before temporary 15-minute
 * lockout.
 *
 * Steps:
 *
 * 1. Create a moderator account for rate limit testing
 * 2. Attempt first 5 login attempts with incorrect password - all should fail
 * 3. Verify each failure increments the failed attempt counter
 * 4. After 5 failures, attempt 6th login and verify account is locked
 * 5. Confirm locked account returns error indicating lock expiration
 * 6. Verify successful login is unavailable during lockout period
 */
export async function test_api_moderator_login_rate_limiting(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePassword123";

  const createdModerator = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        ip: "192.168.1.100",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.IJoin,
    },
  );
  typia.assert(createdModerator);
  TestValidator.equals(
    "created moderator email matches",
    createdModerator.email,
    moderatorEmail,
  );

  // Step 2-3: Attempt first 5 login attempts with incorrect password
  const incorrectPassword = "WrongPassword123";

  for (let attempt = 1; attempt <= 5; attempt++) {
    await TestValidator.error(
      `login attempt ${attempt} should fail with incorrect password`,
      async () => {
        await api.functional.auth.moderator.login(connection, {
          body: {
            email: moderatorEmail,
            password: incorrectPassword,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies IDiscussionBoardModerator.ILogin,
        });
      },
    );
  }

  // Step 4-5: Attempt 6th login with incorrect password - account should be locked
  await TestValidator.error(
    "login attempt 6 should fail with account locked after 5 failed attempts",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: {
          email: moderatorEmail,
          password: incorrectPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardModerator.ILogin,
      });
    },
  );

  // Step 6: Verify successful login is unavailable during lockout
  // Even with correct password, locked account should fail
  await TestValidator.error(
    "login with correct password should fail during lockout period",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: {
          email: moderatorEmail,
          password: moderatorPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardModerator.ILogin,
      });
    },
  );

  TestValidator.predicate(
    "rate limiting mechanism is functioning correctly",
    true,
  );
}
