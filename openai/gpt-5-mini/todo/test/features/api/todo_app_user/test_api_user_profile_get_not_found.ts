import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Verify 404 Not Found is returned when requesting a non-existent userId.
 *
 * Steps:
 *
 * 1. Register a fresh user via POST /auth/user/join to obtain authentication
 *    token.
 * 2. Generate a valid UUID that does not match the created user's id.
 * 3. Call GET /todoApp/user/users/{userId} with the generated UUID and expect 404.
 *
 * Purpose: Confirms the endpoint returns 404 for missing resources and that
 * authentication is required and handled by the SDK's join call.
 */
export async function test_api_user_profile_get_not_found(
  connection: api.IConnection,
) {
  // 1) Register a fresh user to satisfy authentication requirement
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password1234",
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppUser.ICreate;

  const authorized: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // Ensure we have a valid created user id
  const createdUserId: string & tags.Format<"uuid"> = authorized.id;

  // 2) Generate a valid UUID that is not the created user's id
  let nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // Extremely unlikely, but guard against collision with created user's id
  if (nonExistentId === createdUserId) {
    nonExistentId = typia.random<string & tags.Format<"uuid">>();
    // If it still equals (virtually impossible), use a simple fallback loop
    while (nonExistentId === createdUserId) {
      nonExistentId = typia.random<string & tags.Format<"uuid">>();
    }
  }

  // 3) Call GET /todoApp/user/users/{userId} and expect 404 Not Found
  await TestValidator.httpError(
    "requesting non-existent user should return 404",
    404,
    async () => {
      await api.functional.todoApp.user.users.at(connection, {
        userId: nonExistentId,
      });
    },
  );
}
