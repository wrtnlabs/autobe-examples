import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_user_profile_retrieval_by_id(
  connection: api.IConnection,
) {
  // Step 1: Authenticate and create user via /auth/user/join
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const authorized: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password,
      } satisfies ITodoAppUser.ICreate,
    });
  typia.assert(authorized);

  // Step 2: Use the returned userId to fetch profile via /todoApp/user/users/{userId}
  const profile: ITodoAppUser = await api.functional.todoApp.user.users.at(
    connection,
    {
      userId: authorized.id,
    },
  );
  typia.assert(profile);

  // Step 3: Validate profile contains expected fields and excludes sensitive data
  TestValidator.equals("user email matches", profile.email, email);
  TestValidator.predicate(
    "user has created_at field",
    typeof profile.created_at === "string",
  );
  TestValidator.predicate(
    "user has updated_at field",
    typeof profile.updated_at === "string",
  );
  TestValidator.equals(
    "user is active (deleted_at undefined)",
    profile.deleted_at,
    undefined,
  );
  TestValidator.predicate(
    "password_hash is not exposed",
    profile.password_hash === undefined,
  );

  // Step 4: Verify non-existent userId returns 404 error
  await TestValidator.error(
    "non-existent userId should return 404",
    async () => {
      await api.functional.todoApp.user.users.at(connection, {
        userId: "00000000-0000-0000-0000-000000000000",
      });
    },
  );
}
