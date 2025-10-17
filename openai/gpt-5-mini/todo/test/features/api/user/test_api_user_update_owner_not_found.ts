import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Verify owner-update of a non-existent user fails while authenticated as
 * another user.
 *
 * Steps:
 *
 * 1. Register (join) a new user via POST /auth/user/join to obtain an
 *    authenticated session.
 * 2. Generate a well-formed UUID that does not correspond to any existing user.
 * 3. Attempt to PUT /todoApp/user/users/{nonExistentUserId} authenticated as the
 *    created user. Expect an error (resource not found). We assert an error is
 *    thrown (do not assert HTTP status number).
 * 4. (Positive sanity) Update the created user's own profile to confirm
 *    owner-update works and authentication succeeded.
 */
export async function test_api_user_update_owner_not_found(
  connection: api.IConnection,
) {
  // 1) Register a new user and obtain authorization (SDK auto-sets Authorization header)
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd123",
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppUser.ICreate;

  const authorized: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: createBody,
    });
  // Validate the authorized response and token presence
  typia.assert(authorized);
  typia.assert<IAuthorizationToken>(authorized.token);

  // 2) Generate a well-formed UUID that (very likely) does not exist in the system
  const nonExistentUserId = typia.random<string & tags.Format<"uuid">>();

  // 3) Attempt to update the non-existent user while authenticated as the created user
  // Expect an error to be thrown. Use TestValidator.error with await because callback is async.
  await TestValidator.error(
    "updating non-existent user should fail",
    async () => {
      await api.functional.todoApp.user.users.update(connection, {
        userId: nonExistentUserId,
        body: {
          display_name: RandomGenerator.name(),
        } satisfies ITodoAppUser.IUpdate,
      });
    },
  );

  // 4) Positive sanity: update the authenticated user's own profile to ensure owner updates work
  // (This confirms authentication succeeded and the previous failure was due to missing target resource.)
  const updated: ITodoAppUser = await api.functional.todoApp.user.users.update(
    connection,
    {
      userId: authorized.id,
      body: {
        display_name: `${authorized.user?.display_name ?? ""} (updated)`,
      } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(updated);

  // Business validation: updated_at should be >= created_at
  // We compare as strings via Date parse so that timezone is handled properly
  const createdAt = new Date(updated.created_at).getTime();
  const updatedAt = new Date(updated.updated_at).getTime();
  TestValidator.predicate(
    "updated_at is equal or after created_at",
    updatedAt >= createdAt,
  );
}
