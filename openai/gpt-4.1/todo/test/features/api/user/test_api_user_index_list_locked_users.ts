import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUser";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Verify filtered user listing for locked accounts.
 *
 * This test registers a new user, then attempts to filter the users with
 * locked: true by calling /todoList/user/users. Since there is no public API
 * for locking accounts in this environment, we validate that the locked users
 * query either returns empty (normal condition: no locked user) or does not
 * contain the newly created user. This ensures that the admin-focused lock
 * filtering mechanism in user search does not list unlocked users incorrectly.
 *
 * Steps:
 *
 * 1. Register a new user via /auth/user/join.
 * 2. Search for users with locked: true (should be empty if no locked support
 *    exists).
 * 3. Search for users with locked: false (the new user should appear in the
 *    result).
 * 4. Validate business logic: locked:true filter returns no unlocked users, and
 *    locked:false includes the new user.
 */
export async function test_api_user_index_list_locked_users(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email: string = typia.random<string & tags.Format<"email">>();
  const href: string = "https://test-autobe.todo-list-e2e.com/join";
  const referrer: string = "https://test-autobe.todo-list-e2e.com/";
  const joinBody = {
    email,
    password: RandomGenerator.alphaNumeric(10),
    href,
    referrer,
  } satisfies ITodoListUser.IJoin;

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: joinBody },
  );
  typia.assert(user);
  TestValidator.equals("User is not locked after join", user.locked, false);

  // 2. Query users filtered by locked: true
  const lockedTrueBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    locked: true,
  } satisfies ITodoListUser.IRequest;

  const lockedResult: IPageITodoListUser.ISummary =
    await api.functional.todoList.user.users.index(connection, {
      body: lockedTrueBody,
    });
  typia.assert(lockedResult);
  TestValidator.equals(
    "locked:true query returns empty if no locked users",
    lockedResult.data.length,
    0,
  );

  // 3. Query users filtered by locked: false
  const lockedFalseBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    locked: false,
  } satisfies ITodoListUser.IRequest;
  const unlockedResult: IPageITodoListUser.ISummary =
    await api.functional.todoList.user.users.index(connection, {
      body: lockedFalseBody,
    });
  typia.assert(unlockedResult);

  // 4. Validate that the joined user is in the unlocked users
  const foundUser = unlockedResult.data.find((u) => u.email === email);
  TestValidator.predicate(
    "joined user should be in unlocked results",
    foundUser !== undefined,
  );
}
