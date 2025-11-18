import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Validate retrieval of detailed user information for an active account in the
 * Todo List Application.
 *
 * This test follows the workflow:
 *
 * 1. Register a new user, establishing authentication and context isolation for
 *    the test.
 * 2. Retrieve that user's detailed record using their unique id.
 * 3. Check that all essential attributes are present, the email matches the input,
 *    deleted_at is null (active), and no password hash or secrets leak.
 * 4. Validate correctness for privacy, business logic, and account isolation.
 */
export async function test_api_todo_user_detail_retrieval_with_valid_user_context(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email = typia.random<string & tags.Format<"email">>();
  const registrationInput = {
    email,
    password: RandomGenerator.alphaNumeric(12),
    href: "https://app.example.com/auth/register",
    referrer: "https://app.example.com/landing",
  } satisfies ITodoUser.IJoin;

  const authorized = await api.functional.auth.user.join(connection, {
    body: registrationInput,
  });
  typia.assert(authorized);

  // 2. Retrieve user details
  const user = await api.functional.todo.user.users.at(connection, {
    userId: authorized.id,
  });
  typia.assert(user);

  // 3. Field validations
  TestValidator.equals("user id matches registration", user.id, authorized.id);
  TestValidator.equals("email matches registration", user.email, email);
  TestValidator.predicate(
    "created_at is valid ISO string",
    typeof user.created_at === "string" && !isNaN(Date.parse(user.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO string",
    typeof user.updated_at === "string" && !isNaN(Date.parse(user.updated_at)),
  );
  TestValidator.equals(
    "deleted_at is null for active user",
    user.deleted_at,
    null,
  );

  // 4. Privacy fields - password hash/secret must not be present
  TestValidator.predicate(
    "no password hash or token in user detail",
    typeof (user as any).password_hash === "undefined" &&
      typeof (user as any).token === "undefined",
  );
}
