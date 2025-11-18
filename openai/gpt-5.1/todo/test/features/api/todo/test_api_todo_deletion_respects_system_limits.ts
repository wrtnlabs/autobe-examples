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

export async function test_api_todo_deletion_respects_system_limits(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain an administrative context
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "Adm1n#" as string & tags.Format<"password">,
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/join",
    referrer: "https://admin.todo-app.test/",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAfterJoin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAfterJoin);

  // 2. Admin logs in explicitly (also validates login flow; not strictly required
  //    but matches dependency list)
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/login",
    referrer: "https://admin.todo-app.test/",
  } satisfies ITodoAppAdminUser.ILogin;

  const adminAfterLogin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAfterLogin);

  // 3. Configure system setting: max_active_todos_per_user = 2
  const systemSettingBody = {
    key: "max_active_todos_per_user",
    value: "2",
    type: "int",
    description:
      "Maximum number of active todos per member user for limit enforcement e2e test.",
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert(systemSetting);

  // 4. Member joins
  const memberJoinBody = {
    email: `member+${RandomGenerator.alphaNumeric(8)}@example.com` as string &
      tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://todo-app.test/join" as string & tags.Format<"uri">,
    referrer: "https://landing.todo-app.test/" as string & tags.Format<"uri">,
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAfterJoin: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAfterJoin);

  // 5. Member logs in (again, not strictly necessary if join logs in, but this
  //    ensures we have a fresh authenticated member context and validates login)
  const memberLoginBody = {
    email: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://todo-app.test/login" as string & tags.Format<"uri">,
    referrer: "https://todo-app.test/" as string & tags.Format<"uri">,
  } satisfies ITodoAppMemberUserLogin.ICreate;

  const memberAfterLogin: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAfterLogin);

  // Helper to build a todo create payload with optional custom title suffix
  const buildTodoCreateBody = (suffix: string): ITodoAppTodo.ICreate => {
    const now = new Date();
    const due = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return {
      title: `Todo ${suffix}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
      description: RandomGenerator.paragraph({ sentences: 6 }),
      state: "active",
      due_date: due.toISOString(),
    } satisfies ITodoAppTodo.ICreate;
  };

  // 6. Create todos up to the configured max (2)
  const todo1: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: buildTodoCreateBody("#1"),
    });
  typia.assert(todo1);

  const todo2: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: buildTodoCreateBody("#2"),
    });
  typia.assert(todo2);

  // 7. Attempt to create one more todo beyond the limit and expect failure
  await TestValidator.error(
    "creating a 3rd active todo should violate max_active_todos_per_user limit",
    async () => {
      await api.functional.todoApp.memberUser.todos.create(connection, {
        body: buildTodoCreateBody("#3-over-limit"),
      });
    },
  );

  // 8. Delete one of the existing todos (todo1)
  await api.functional.todoApp.memberUser.todos.erase(connection, {
    todoId: todo1.id,
  });

  // 9. After deletion, creating a new active todo should now succeed again
  const todo3AfterDelete: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: buildTodoCreateBody("#3-after-delete"),
    });
  typia.assert(todo3AfterDelete);

  // 10. Optionally, confirm that attempting to exceed the limit again fails once
  //     the active count is back at the cap.
  await TestValidator.error(
    "creating a 3rd active todo after refilling to the limit should fail again",
    async () => {
      await api.functional.todoApp.memberUser.todos.create(connection, {
        body: buildTodoCreateBody("#4-over-limit-again"),
      });
    },
  );
}
