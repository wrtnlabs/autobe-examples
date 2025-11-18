import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_retrieve_by_id_unicode_email(
  connection: api.IConnection,
) {
  // Step 1: Create a new user with Unicode characters in email
  const unicodeEmail: string = `user_123_测试_日本語_русский@example.com`;
  const password = "SecurePass123!";

  const joinedUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: unicodeEmail,
        password: password,
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(joinedUser);

  // Step 2: Retrieve the user by ID to validate Unicode email handling
  const retrievedUser: ITodoListUser =
    await api.functional.todoList.user.actors.at(connection, {
      userId: joinedUser.id,
    });
  typia.assert(retrievedUser);

  // Step 3: Validate that the retrieved user has the expected email
  // Note: ITodoListUser is string type in this system, representing the email
  TestValidator.equals(
    "retrieved user email matches created email",
    retrievedUser,
    unicodeEmail,
  );
}
