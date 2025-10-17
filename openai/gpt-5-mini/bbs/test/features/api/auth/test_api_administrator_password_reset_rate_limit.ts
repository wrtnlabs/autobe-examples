import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function test_api_administrator_password_reset_rate_limit(
  connection: api.IConnection,
) {
  /**
   * Purpose: Validate anti-abuse protections for administrator password reset
   * requests by rapidly sending repeated reset requests and ensuring the system
   * demonstrates rate-limiting behavior (observed as thrown errors or fewer
   * successful acknowledgements than attempts) while never asserting specific
   * HTTP status codes or inspecting connection.headers.
   *
   * Steps:
   *
   * 1. Create a new administrator via POST /auth/administrator/join
   * 2. Rapidly send multiple POST /auth/administrator/password/reset calls for the
   *    same email address
   * 3. For each attempt, classify outcome as success (response returned) or error
   *    (thrown). Do not inspect HTTP status codes.
   * 4. Assert that rate-limiting was observed (errors occurred or not all attempts
   *    succeeded). Validate shapes of successful responses with typia.assert.
   */

  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12); // >=10 chars

  const joinBody = {
    email: adminEmail,
    password: adminPassword,
    username: RandomGenerator.name(1),
  } satisfies IEconPoliticalForumAdministrator.IJoin;

  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  const totalAttempts = 8;
  const successes: IEconPoliticalForumAdministrator.IResetRequestResponse[] =
    [];
  const errors: unknown[] = [];

  for (let i = 0; i < totalAttempts; ++i) {
    try {
      const resp: IEconPoliticalForumAdministrator.IResetRequestResponse =
        await api.functional.auth.administrator.password.reset.requestPasswordReset(
          connection,
          {
            body: {
              email: adminEmail,
            } satisfies IEconPoliticalForumAdministrator.IRequestPasswordReset,
          },
        );
      typia.assert(resp);
      successes.push(resp);
    } catch (exp) {
      // Record occurrence of an error (rate-limit or other server-side
      // rejection). Do NOT inspect HTTP status codes or headers.
      errors.push(exp);
    }
  }

  // Business-level assertion: observe rate limiting either as thrown errors or
  // as fewer successful acknowledgements than attempts.
  TestValidator.predicate(
    "rate limiting observed: at least one attempt failed or not all succeeded",
    errors.length > 0 || successes.length < totalAttempts,
  );

  // All successful responses must conform to the response DTO and include a
  // non-empty message and success boolean. typia.assert enforces type shape;
  // this predicate checks business-level expectations about the message.
  TestValidator.predicate(
    "successful responses include a message and success flag",
    successes.every(
      (s) =>
        typeof s.message === "string" &&
        typeof s.success === "boolean" &&
        s.message.length > 0,
    ),
  );
}
