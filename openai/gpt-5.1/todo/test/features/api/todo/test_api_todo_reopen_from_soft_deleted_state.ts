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
 * Validate reopening a logically deleted todo for its owning member user.
 *
 * Business workflow covered by this E2E test:
 *
 * 1. Bootstrap an admin user and create a generic system setting that conceptually
 *    enables todo reopening behavior.
 * 2. Register a member user and authenticate as that member.
 * 3. As the member, create a new active todo.
 * 4. Delete the todo using the memberUser DELETE endpoint to simulate a logically
 *    deleted state.
 * 5. Call the reopen action on the same todoId.
 * 6. Assert that the reopened todo:
 *
 *    - Reuses the same id and owner.
 *    - Preserves created_at but advances updated_at.
 *    - Has deleted_at cleared to null.
 *    - Has state set to an active value ("active").
 * 7. Register a second member user and verify that this non-owner cannot reopen
 *    the first member's todo, ensuring ownership enforcement.
 */
export async function test_api_todo_reopen_from_soft_deleted_state(
  connection: api.IConnection,
) {
  // 1. Admin bootstrap & system setting creation
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todoapp.test/join",
    referrer: "https://admin.todoapp.test/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const systemSettingBody = {
    key: "todo_reopen_enabled",
    value: "true",
    type: "boolean",
    description: "Flag to conceptually enable todo reopen behavior in tests",
    group: "features",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert(systemSetting);

  // 2. Member registration and authentication (owner)
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://todoapp.test/signup",
    referrer: "https://todoapp.test/landing",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. Create an active todo for the member
  const createTodoBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    due_date: null,
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: createTodoBody,
    });
  typia.assert(createdTodo);

  // 4. Delete the todo to simulate a logically deleted state prerequisite
  await api.functional.todoApp.memberUser.todos.erase(connection, {
    todoId: createdTodo.id,
  });

  // 5. Reopen the same todo
  const reopenedTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.reopen(connection, {
      todoId: createdTodo.id,
    });
  typia.assert(reopenedTodo);

  // 6. Business assertions on reopened todo
  TestValidator.equals(
    "reopened todo should keep the same id",
    reopenedTodo.id,
    createdTodo.id,
  );

  TestValidator.equals(
    "reopened todo should keep same owner memberUser.id",
    reopenedTodo.memberUser.id,
    createdTodo.memberUser.id,
  );

  TestValidator.equals(
    "reopened todo should preserve created_at",
    reopenedTodo.created_at,
    createdTodo.created_at,
  );

  const createdUpdatedAt = new Date(createdTodo.updated_at).getTime();
  const reopenedUpdatedAt = new Date(reopenedTodo.updated_at).getTime();
  TestValidator.predicate(
    "reopened todo updated_at should be equal or later than original",
    reopenedUpdatedAt >= createdUpdatedAt,
  );

  TestValidator.equals(
    "reopened todo deleted_at should be null after reopen",
    reopenedTodo.deleted_at ?? null,
    null,
  );

  TestValidator.equals(
    "reopened todo state should be active",
    reopenedTodo.state,
    "active",
  );

  // 7. Ownership enforcement: another member cannot reopen this todo
  const intruderJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://todoapp.test/signup",
    referrer: "https://todoapp.test/landing",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const intruderAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: intruderJoinBody,
    });
  typia.assert(intruderAuthorized);

  await TestValidator.error(
    "non-owner member should not be able to reopen another member's todo",
    async () => {
      await api.functional.todoApp.memberUser.todos.reopen(connection, {
        todoId: createdTodo.id,
      });
    },
  );
}
