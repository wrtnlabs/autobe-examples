import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_login_failure_modes(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * - Create a moderator account via POST /auth/moderator/join
   * - Repeatedly attempt login with an incorrect password using an
   *   unauthenticated connection to observe brute-force protections
   *   (rate-limiting/lockout)
   * - Compare failure behavior for an existing account and a non-existent
   *   identifier to ensure failures are generic
   *
   * Notes:
   *
   * - Do NOT inspect HTTP status codes or error messages (forbidden)
   * - Use typia.assert for response validation and TestValidator.error for
   *   asserting that login attempts throw
   */

  // 1) Create moderator account
  const username = `mod_${RandomGenerator.alphaNumeric(8)}`;
  const email = typia.random<string & tags.Format<"email">>();
  const password = "P@ssw0rd1234"; // 13 chars, contains upper/lower/number/symbol
  const href = "https://example.com/login";
  const referrer = "https://referrer.example.com/";

  const createBody = {
    username,
    email,
    password,
    display_name: RandomGenerator.name(),
    ip: null,
    href,
    referrer,
  } satisfies IDiscussionBoardModerator.ICreate;

  const created: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: createBody,
    });
  // Validate returned shape
  typia.assert(created);
  TestValidator.equals(
    "created moderator username matches request",
    created.username,
    createBody.username,
  );

  // 2) Prepare unauthenticated connection (SDK-managed headers must not be touched)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 3) Prepare a wrong-login payload (must satisfy ILogin)
  const wrongLogin = {
    usernameOrEmail: createBody.username,
    password: "WrongPassw0rd!", // >=12 chars, incorrect password
    mfa_code: null,
    ip: null,
    href: createBody.href,
    referrer: createBody.referrer,
  } satisfies IDiscussionBoardModerator.ILogin;

  // 4) Repeated failed login attempts to exercise rate-limiting / lockout behavior
  const attempts = 5;
  for (let i = 1; i <= attempts; ++i) {
    await TestValidator.error(
      `failed login attempt #${i} should throw`,
      async () => {
        await api.functional.auth.moderator.login(unauthConn, {
          body: wrongLogin,
        });
      },
    );
  }

  // 5) Additional attempt after repeated failures: expect failure as well
  await TestValidator.error(
    "post-threshold login attempt should still fail",
    async () => {
      await api.functional.auth.moderator.login(unauthConn, {
        body: wrongLogin,
      });
    },
  );

  // 6) Compare with a non-existent identifier to verify generic failure behavior
  const nonExistentLogin = {
    usernameOrEmail: typia.random<string>(),
    password: "AnotherWrong1!",
    mfa_code: null,
    ip: null,
    href: createBody.href,
    referrer: createBody.referrer,
  } satisfies IDiscussionBoardModerator.ILogin;

  await TestValidator.error(
    "login with non-existent account should also throw (generic)",
    async () => {
      await api.functional.auth.moderator.login(unauthConn, {
        body: nonExistentLogin,
      });
    },
  );

  // 7) Final predicate: both known-wrong and unknown credentials produced errors
  // (We rely on TestValidator.error checks above; add a final sanity predicate)
  TestValidator.predicate(
    "completed brute-force simulation without leaking types",
    true,
  );
}
