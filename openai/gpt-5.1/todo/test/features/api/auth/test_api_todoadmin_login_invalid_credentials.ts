import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminLogin";

/**
 * Validate that todoAdmin login with invalid credentials is rejected.
 *
 * Business goal
 *
 * - Ensure that POST /auth/todoAdmin/login does not authenticate or issue tokens
 *   when provided with incorrect credentials.
 * - Confirm that failures are surfaced as errors (HttpError via SDK) rather than
 *   successful ITodoAppTodoAdmin.IAuthorized responses.
 * - Avoid relying on any join/registration or admin-introspection APIs, which are
 *   not available in this context.
 *
 * Scenario (adapted from requirements and constrained by available APIs)
 *
 * 1. Build a realistic ITodoAppTodoAdminLogin.IRequest payload with:
 *
 *    - Syntactically valid but random email address (unlikely to exist).
 *    - Random password string.
 *    - Realistic href/referrer URI strings.
 *    - Ip either omitted (undefined) or explicitly null.
 * 2. Call api.functional.auth.todoAdmin.login(connection, { body }) with these
 *    credentials inside TestValidator.error, expecting the SDK to throw due to
 *    authentication failure.
 * 3. Because the login call throws, no ITodoAppTodoAdmin.IAuthorized object or
 *    IAuthorizationToken bundle is ever produced; this implicitly verifies that
 *    invalid credentials never create tokens or authorized admin context.
 * 4. Repeat the invalid-login attempt with a slightly different payload variant
 *    (e.g., explicit null ip and different random credentials) to ensure
 *    consistent behavior across variations.
 */
export async function test_api_todoadmin_login_invalid_credentials(
  connection: api.IConnection,
) {
  // Helper to build a realistic login request with random but invalid credentials
  const buildInvalidRequest = (
    withNullIp: boolean,
  ): ITodoAppTodoAdminLogin.IRequest => {
    const email: string & tags.Format<"email"> = typia.random<
      string & tags.Format<"email">
    >();

    const href: string & tags.Format<"uri"> = typia.random<
      string & tags.Format<"uri">
    >();
    const referrer: string & tags.Format<"uri"> = typia.random<
      string & tags.Format<"uri">
    >();

    const base = {
      email,
      password: RandomGenerator.alphaNumeric(24),
      href,
      referrer,
      ip: withNullIp ? null : undefined,
    } satisfies ITodoAppTodoAdminLogin.IRequest;

    return base;
  };

  // Case 1: Invalid credentials with ip omitted (undefined)
  const invalidRequest1 = buildInvalidRequest(false);

  await TestValidator.error(
    "todoAdmin login with non-existent credentials should fail (ip undefined)",
    async () => {
      // Attempt login; should throw and never return ITodoAppTodoAdmin.IAuthorized
      await api.functional.auth.todoAdmin.login(connection, {
        body: invalidRequest1,
      });
    },
  );

  // Case 2: Invalid credentials with explicit null ip
  const invalidRequest2 = buildInvalidRequest(true);

  await TestValidator.error(
    "todoAdmin login with non-existent credentials should fail (ip null)",
    async () => {
      await api.functional.auth.todoAdmin.login(connection, {
        body: invalidRequest2,
      });
    },
  );

  // Sanity check that our request DTOs are structurally correct
  typia.assert<ITodoAppTodoAdminLogin.IRequest>(invalidRequest1);
  typia.assert<ITodoAppTodoAdminLogin.IRequest>(invalidRequest2);
}
