import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Enforce ownership rules on todo completion.
 *
 * Business goal
 *
 * - Ensure that a member user cannot mark another member user’s todo as completed
 *   through PUT /todoApp/memberUser/todos/{todoId}/complete.
 * - Verify that the system enforces strict ownership on completion state
 *   transitions, rejecting cross-account attempts while allowing the legitimate
 *   owner to complete the todo.
 *
 * High-level steps
 *
 * 1. Bootstrap an admin user and configure system settings so todos can be created
 *    and completed normally.
 * 2. Register Member A, authenticate as Member A, and create a todo (owned by
 *    Member A).
 * 3. Register Member B and authenticate as Member B.
 * 4. While authenticated as Member B, attempt to complete Member A’s todo and
 *    assert that the operation fails.
 * 5. Switch authentication back to Member A and successfully complete the todo,
 *    verifying that ownership is respected and that the todo remains in a valid
 *    state for its rightful owner.
 */
export async function test_api_todo_completion_ownership_enforcement(
  connection: api.IConnection,
) {
  // 1. Admin bootstrap: join as admin and create a system setting
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: RandomGenerator.name(1),
    status: "active",
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const settingBody = {
    key: "todo_completion_enabled",
    value: "true",
    type: "boolean",
    description: "Flag to enable todo completion operations in tests",
    group: "feature_flags",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: settingBody,
    });
  typia.assert(systemSetting);

  // 2. Member A registration and login
  const memberAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberAPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const memberAJoinBody = {
    email: memberAEmail,
    password: memberAPassword,
    displayName: RandomGenerator.name(1),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberAAuthorized);

  // 3. Member A creates a todo
  const memberATodoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const memberATodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: memberATodoCreateBody,
    });
  typia.assert(memberATodo);

  // 4. Member B registration (this switches auth context to Member B)
  const memberBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberBPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const memberBJoinBody = {
    email: memberBEmail,
    password: memberBPassword,
    displayName: RandomGenerator.name(1),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberBAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberBAuthorized);

  TestValidator.notEquals(
    "member A and member B must be distinct users",
    memberAAuthorized.id,
    memberBAuthorized.id,
  );

  // 5. Unauthorized completion attempt by Member B
  await TestValidator.error(
    "member B cannot complete member A's todo",
    async () => {
      await api.functional.todoApp.memberUser.todos.complete(connection, {
        todoId: memberATodo.id,
      });
    },
  );

  // 6. Switch back to Member A and successfully complete the todo
  const memberALoginBody = {
    email: memberAEmail,
    password: memberAPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserLogin.ICreate;

  const memberALoginAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginBody,
    });
  typia.assert(memberALoginAuthorized);

  TestValidator.equals(
    "member A login id should equal member A join id",
    memberALoginAuthorized.id,
    memberAAuthorized.id,
  );

  const completedTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.complete(connection, {
      todoId: memberATodo.id,
    });
  typia.assert(completedTodo);

  TestValidator.equals(
    "completed todo must keep same id",
    completedTodo.id,
    memberATodo.id,
  );
  TestValidator.equals(
    "completed todo must remain owned by member A",
    completedTodo.memberUser.id,
    memberAAuthorized.id,
  );
  TestValidator.predicate(
    "completed todo should have a completion timestamp",
    completedTodo.completed_at !== null &&
      completedTodo.completed_at !== undefined,
  );
}
