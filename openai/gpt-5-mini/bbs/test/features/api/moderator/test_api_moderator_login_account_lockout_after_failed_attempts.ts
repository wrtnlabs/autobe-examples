import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumModerator";

export async function test_api_moderator_login_account_lockout_after_failed_attempts(
  connection: api.IConnection,
) {
  /**
   * Validate moderator account lockout after repeated failed login attempts.
   *
   * Workflow:
   *
   * 1. Create a unique moderator-capable account via POST /auth/moderator/join
   * 2. Use an unauthenticated connection clone for repeated login attempts
   * 3. Perform repeated failed login attempts with wrong password until threshold
   * 4. Attempt login with correct credentials and assert it is rejected due to
   *    lockout
   * 5. (Optional) If test harness supports time travel, advance clock beyond TTL
   *    and assert successful login
   */

  // 0. Configuration: adjust for the environment if needed
  const THRESHOLD = 5; // Number of failed attempts to trigger lockout in most environments. Adjust in CI if configured differently.

  // 1. Prepare unique moderator account data
  const username = RandomGenerator.alphaNumeric(8);
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Str0ng!Passw0rd"; // stable test credential
  const display_name = RandomGenerator.name();

  const createBody = {
    username,
    email,
    password,
    display_name,
  } satisfies IEconPoliticalForumModerator.ICreate;

  // Use a cloned unauthenticated connection for the join so that we control auth flows separately
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2. Register the moderator-capable account
  const created: IEconPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.join(unauthConn, {
      body: createBody,
    });
  typia.assert(created);

  // Record created id for visibility if needed by cleanup tooling
  TestValidator.predicate(
    "created moderator has id",
    typeof created.id === "string",
  );

  // 3. Perform repeated failed login attempts
  for (let i = 0; i < THRESHOLD; ++i) {
    await TestValidator.error(
      `failed login attempt #${i + 1} should throw`,
      async () => {
        await api.functional.auth.moderator.login(unauthConn, {
          body: {
            usernameOrEmail: username,
            password: "incorrect-password",
          } satisfies IEconPoliticalForumModerator.ILogin,
        });
      },
    );
  }

  // 4. After crossing the threshold, a correct credential attempt must be rejected (lockout enforced)
  await TestValidator.error(
    "correct credentials should be rejected while account is locked",
    async () => {
      await api.functional.auth.moderator.login(unauthConn, {
        body: {
          usernameOrEmail: username,
          password,
        } satisfies IEconPoliticalForumModerator.ILogin,
      });
    },
  );

  // 5. Optional: If test harness supports time-travel or TTL control, verify successful login after lock expiry.
  // This block is intentionally commented out because most CI systems do not support time travel.
  // If your environment provides a way to advance time or manipulate locked_until, uncomment and adapt the code below.
  //
  // // Advance clock to beyond locked_until then retry a correct login
  // // await timeTravel.advance(lockedDurationMs + 1000);
  // const postLockAuth = await api.functional.auth.moderator.login(unauthConn, {
  //   body: {
  //     usernameOrEmail: username,
  //     password,
  //   } satisfies IEconPoliticalForumModerator.ILogin,
  // });
  // typia.assert(postLockAuth);

  // Note: No deletion API is available in the provided SDK. Use CI DB teardown or admin utilities to remove this test account after the suite run.
}
