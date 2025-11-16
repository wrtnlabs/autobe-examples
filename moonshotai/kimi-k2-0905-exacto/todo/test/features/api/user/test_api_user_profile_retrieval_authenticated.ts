import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_user_profile_retrieval_authenticated(
  connection: api.IConnection,
) {
  // Step 1: Create new user account with proper authentication
  const joinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.name(),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies ITodoAppUser.IJoin;

  const authUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: joinData,
    });
  typia.assert(authUser);

  // Step 2: Retrieve authenticated user's profile
  const profile: ITodoAppUser =
    await api.functional.todoApp.user.auth.profile.at(connection);
  typia.assert(profile);

  // Step 3: Validate profile data matches authentication data
  TestValidator.equals("user ID consistency", profile.id, authUser.id);
  TestValidator.equals("email consistency", profile.email, authUser.email);

  // Step 4: Validate timestamps are in correct order and format
  const createdAt = new Date(profile.created_at);
  const updatedAt = new Date(profile.updated_at);

  TestValidator.predicate(
    "created_at is valid ISO timestamp",
    () => !isNaN(createdAt.getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid ISO timestamp",
    () => !isNaN(updatedAt.getTime()),
  );
  TestValidator.predicate(
    "created before updated",
    () => createdAt.getTime() <= updatedAt.getTime(),
  );
}
