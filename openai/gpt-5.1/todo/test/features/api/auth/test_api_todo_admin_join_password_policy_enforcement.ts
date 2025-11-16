import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";

/**
 * Verify that todoAdmin registration rejects weak passwords.
 *
 * Business goal: Ensure that the public administrative registration endpoint
 * `/auth/todoAdmin/join` enforces password strength rules at the business-logic
 * layer and does not create privileged admin accounts when a weak password is
 * submitted.
 *
 * Scenario:
 *
 * 1. Prepare a registration payload matching ITodoAppTodoAdminJoin.IRequest where:
 *
 *    - `email` is a syntactically valid, unique email address.
 *    - `password` is deliberately weak (e.g., very short numeric string), but still
 *         a valid TypeScript string so that only business validation fails, not
 *         type checking.
 *    - `displayName` is an optional, realistic non-null name.
 *    - `href` and `referrer` are valid absolute URIs.
 * 2. Invoke `api.functional.auth.todoAdmin.join` with this payload.
 * 3. Expect the call to fail due to password policy enforcement.
 *
 *    - Use `await TestValidator.error` to assert that an error is thrown.
 *    - Do NOT assert specific HTTP status codes or inspect error payloads.
 * 4. Rely on the failure to imply that no ITodoAppTodoAdmin.IAuthorized object was
 *    returned and therefore no admin account or tokens were issued for the
 *    weak-password registration attempt.
 */
export async function test_api_todo_admin_join_password_policy_enforcement(
  connection: api.IConnection,
) {
  // 1. Build a weak-password registration request body.
  const weakPasswordRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "12345", // intentionally weak: very short and simple
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  // 2 & 3. Call join and assert that it fails because of password policy.
  await TestValidator.error(
    "todoAdmin join rejects weak password",
    async () => {
      await api.functional.auth.todoAdmin.join(connection, {
        body: weakPasswordRequest,
      });
    },
  );
}
