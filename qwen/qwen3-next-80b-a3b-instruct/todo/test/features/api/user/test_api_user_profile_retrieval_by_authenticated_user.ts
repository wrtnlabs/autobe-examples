import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_profile_retrieval_by_authenticated_user(
  connection: api.IConnection,
) {
  const userRegistration = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(userRegistration);

  const retrievedUser = await api.functional.todoList.user.todo_list_users.at(
    connection,
    {
      userId: userRegistration.id,
    },
  );
  typia.assert(retrievedUser);

  TestValidator.equals(
    "retrieved user ID matches registered user ID",
    retrievedUser.id,
    userRegistration.id,
  );
  TestValidator.equals(
    "retrieved user email matches registered email",
    retrievedUser.email,
    userRegistration.email,
  );
  TestValidator.equals(
    "created_at is present and valid",
    typeof retrievedUser.created_at,
    "string",
  );
  TestValidator.predicate(
    "deleted_at is null or undefined",
    retrievedUser.deleted_at == null,
  );
  TestValidator.predicate(
    "updated_at is either undefined or valid date-time",
    retrievedUser.updated_at == null ||
      (typeof retrievedUser.updated_at === "string" &&
        new Date(retrievedUser.updated_at).toISOString() ===
          retrievedUser.updated_at),
  );
}
