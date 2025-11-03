import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

/**
 * Validate that a TodoUser owner can update their own public profile fields and
 * that the API does not leak sensitive authentication secrets.
 *
 * Business flow:
 *
 * 1. Create a new todoUser via POST /auth/todoUser/join (ITodoAppTodoUser.ICreate)
 *    and capture the authorized response (ITodoAppTodoUser.IAuthorized).
 * 2. Perform PUT /todoApp/todoUser/todoUsers/{todoUserId} as the owner to update
 *    allowed profile fields (ITodoAppTodoUser.IUpdate).
 * 3. Assert returned ITodoAppTodoUser reflects changes, preserves email, and does
 *    not expose secrets. Verify updatedAt changed relative to the authorized
 *    response's updatedAt.
 * 4. Ownership enforcement: create a second user using a cloned connection (so the
 *    first user's Authorization is not overwritten), then attempt to update the
 *    second user's profile while authenticated as the first user and assert the
 *    operation fails.
 *
 * NOTE: The provided SDK does not include a GET-by-id endpoint for users. The
 * test therefore validates persistence by comparing the update response with
 * the original authorized response and by ensuring timestamps reflect a
 * modification.
 */
export async function test_api_todo_user_profile_update_by_owner(
  connection: api.IConnection,
) {
  // 1) Create initial owner account via join
  const ownerEmail: string = typia.random<string & tags.Format<"email">>();
  const ownerJoinBody = {
    email: ownerEmail,
    password: "P@ssw0rd1",
    displayName: RandomGenerator.name(),
    href: "http://localhost/",
    referrer: "http://localhost/referrer",
  } satisfies ITodoAppTodoUser.ICreate;

  const ownerAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: ownerJoinBody,
    });
  typia.assert(ownerAuthorized);

  const ownerId: string = ownerAuthorized.id;
  // Note: SDK sets connection.headers.Authorization = ownerAuthorized.token.access

  // 2) Owner updates their profile (displayName)
  const updatedDisplayName = "Updated " + RandomGenerator.name(1);
  const updateBody = {
    displayName: updatedDisplayName,
  } satisfies ITodoAppTodoUser.IUpdate;

  const updated: ITodoAppTodoUser =
    await api.functional.todoApp.todoUser.todoUsers.update(connection, {
      todoUserId: ownerId,
      body: updateBody,
    });
  typia.assert(updated);

  // 3) Validate returned data
  TestValidator.equals("updated id equals owner id", updated.id, ownerId);
  TestValidator.equals(
    "displayName updated",
    updated.displayName,
    updatedDisplayName,
  );
  TestValidator.equals("email unchanged", updated.email, ownerEmail);

  // Ensure sensitive fields are not present in the returned DTO (only check via 'in' to avoid accessing non-existent properties)
  TestValidator.predicate(
    "no password_hash leaked",
    !("password_hash" in updated),
  );
  TestValidator.predicate("no mfa_secret leaked", !("mfa_secret" in updated));
  TestValidator.predicate(
    "no mfa_backup_codes leaked",
    !("mfa_backup_codes" in updated),
  );

  // Verify updatedAt advanced relative to the original authorized response
  TestValidator.predicate(
    "updatedAt increased",
    new Date(updated.updatedAt) > new Date(ownerAuthorized.updatedAt),
  );

  // 4) Ownership enforcement: create a second user using a cloned connection
  const connForSecond: api.IConnection = { ...connection, headers: {} };
  const secondEmail: string = typia.random<string & tags.Format<"email">>();
  const secondJoinBody = {
    email: secondEmail,
    password: "P@ssw0rd1",
    displayName: RandomGenerator.name(),
    href: "http://localhost/",
    referrer: "http://localhost/referrer",
  } satisfies ITodoAppTodoUser.ICreate;

  const secondAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connForSecond, {
      body: secondJoinBody,
    });
  typia.assert(secondAuthorized);
  const secondId = secondAuthorized.id;

  // Attempt to update second user's profile while still authenticated as first owner
  await TestValidator.error(
    "owner cannot update another user's profile",
    async () => {
      await api.functional.todoApp.todoUser.todoUsers.update(connection, {
        todoUserId: secondId,
        body: {
          displayName: "Illicit Update",
        } satisfies ITodoAppTodoUser.IUpdate,
      });
    },
  );
}
