import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_user_profile_retrieve_own(
  connection: api.IConnection,
) {
  // 1) Prepare registration body with valid types
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppUser.ICreate;

  // 2) Register (join) a new user. SDK will set connection.headers.Authorization
  const authorized: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: createBody });
  typia.assert(authorized);

  // 3) Fetch the user profile by ID using the same connection (authenticated)
  const profile: ITodoAppUser = await api.functional.todoApp.user.users.at(
    connection,
    { userId: authorized.id },
  );
  typia.assert(profile);

  // 4) Assertions: id matches
  TestValidator.equals(
    "retrieved user id matches created id",
    profile.id,
    authorized.id,
  );

  // 5) Assertions: email present and is a string (business-level presence)
  TestValidator.predicate(
    "profile contains email",
    typeof profile.email === "string",
  );

  // 6) If display_name was provided at join, it should be present or nullable
  TestValidator.predicate(
    "display_name matches input or is null",
    profile.display_name === createBody.display_name ||
      profile.display_name === null,
  );

  // 7) Sensitive fields such as password_hash MUST NOT be present in the profile response
  // (The DTO does not contain password_hash; ensure it's not present at runtime)
  TestValidator.predicate(
    "sensitive field password_hash not exposed",
    !("password_hash" in (profile as Record<string, unknown>)),
  );

  // 8) created_at and updated_at formats are validated by typia.assert. Verify updated_at >= created_at
  const createdAt = new Date(profile.created_at);
  const updatedAt = new Date(profile.updated_at);
  TestValidator.predicate(
    "updated_at is greater than or equal to created_at",
    updatedAt.getTime() >= createdAt.getTime(),
  );
}
