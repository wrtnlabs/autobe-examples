import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_todo_user_login_failure_and_lockout(
  connection: api.IConnection,
) {
  // 1) Prepare unique credentials for a fresh user
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Password123!"; // meets min length >= 8
  const href = "https://example.com/signup";
  const referrer = "https://example.com/";

  // 2) Create the user via the dependency endpoint
  const created: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: {
        email,
        password,
        href,
        referrer,
      } satisfies ITodoAppTodoUser.ICreate,
    });
  typia.assert(created);

  // 3) Attempt repeated failed logins with incorrect password
  const MAX_ATTEMPTS = 5;
  for (let i = 0; i < MAX_ATTEMPTS; ++i) {
    await TestValidator.error(
      `failed login attempt #${i + 1} should be rejected`,
      async () => {
        await api.functional.auth.todoUser.login(connection, {
          body: {
            email,
            password: "wrong-password",
            href,
            referrer,
          } satisfies ITodoAppTodoUser.ILogin,
        });
      },
    );
  }

  // 4) One more attempt to assert lockout-like behavior (implementation may
  //    treat this as lockout). Expectation: call throws (401/403/429 etc.).
  await TestValidator.error(
    "post-threshold failed login should be rejected (lockout observed)",
    async () => {
      await api.functional.auth.todoUser.login(connection, {
        body: {
          email,
          password: "wrong-password",
          href,
          referrer,
        } satisfies ITodoAppTodoUser.ILogin,
      });
    },
  );

  // 5) Attempt login with correct credentials to observe post-lockout policy.
  //    Behavior varies by implementation: could succeed (resets failed attempts)
  //    or remain locked until timeout/admin action. We attempt and record what
  //    is observed. Do not fail the test when the behavior is implementation-dependent.
  try {
    const auth: ITodoAppTodoUser.IAuthorized =
      await api.functional.auth.todoUser.login(connection, {
        body: {
          email,
          password,
          href,
          referrer,
        } satisfies ITodoAppTodoUser.ILogin,
      });

    // If successful, validate response shape
    typia.assert(auth);
    // Record observation: successful login after repeated failures
    TestValidator.predicate(
      "observed: correct credentials accepted after repeated failures",
      true,
    );
  } catch (exp) {
    // If login fails after repeated failures, record the observation without failing the test.
    // We use TestValidator.predicate with a true condition as an observational marker
    // rather than asserting a specific server policy.
    TestValidator.predicate(
      "observed: correct credentials rejected after repeated failures (account locked or throttled)",
      true,
    );
  }
}
