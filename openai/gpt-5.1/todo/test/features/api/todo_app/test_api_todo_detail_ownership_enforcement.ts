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
 * Validate ownership-based access control for todo detail retrieval.
 *
 * Business objectives:
 *
 * - A member user must not be able to retrieve another member user’s todo details
 *   via GET /todoApp/memberUser/todos/{todoId}, even when guessing a valid
 *   todoId.
 * - A member user must still be able to retrieve their own todo details
 *   successfully.
 *
 * High-level steps
 *
 * 1. Admin bootstrap and system settings creation (admin-only context).
 * 2. Member A: join and create a todo (todoA).
 * 3. Member B: join (switch authentication context).
 * 4. Negative case: Member B tries to GET Member A’s todoA by id and must fail
 *    without leaking ITodoAppTodo data.
 * 5. Control case: Member B creates their own todoB and successfully retrieves it
 *    by id.
 */
export async function test_api_todo_detail_ownership_enforcement(
  connection: api.IConnection,
) {
  // 1. Admin bootstrap and system setting creation
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todoapp.local/join",
    referrer: "https://admin.todoapp.local/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const systemSettingBody = {
    key: "todo.max_active_per_user",
    value: "100",
    type: "int",
    description: "Maximum number of active todos per member user for tests.",
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert(systemSetting);

  // 2. Member A: join and create a todo
  const memberAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberAJoinBody = {
    email: memberAEmail,
    password: typia.random<string & tags.Format<"password">>(),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://app.todoapp.local/signup",
    referrer: "https://app.todoapp.local/landing",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAAuth: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberAAuth);

  const todoABody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: RandomGenerator.date(
      new Date(),
      7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const todoA: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoABody,
    });
  typia.assert(todoA);

  TestValidator.equals(
    "created todoA should belong to member A",
    todoA.memberUser.id,
    memberAAuth.id,
  );

  const todoId_A: string & tags.Format<"uuid"> = todoA.id;

  // 3. Member B: join (switches authentication context)
  const memberBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberBJoinBody = {
    email: memberBEmail,
    password: typia.random<string & tags.Format<"password">>(),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://app.todoapp.local/signup",
    referrer: "https://app.todoapp.local/landing",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberBAuth: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberBAuth);

  // 4. Negative case: Member B attempts to read Member A's todo
  await TestValidator.error(
    "member B cannot retrieve member A's todo details",
    async () => {
      await api.functional.todoApp.memberUser.todos.at(connection, {
        todoId: todoId_A,
      });
    },
  );

  // 5. Control case: Member B creates and retrieves their own todo
  const todoBBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    due_date: null,
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const todoB: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoBBody,
    });
  typia.assert(todoB);

  TestValidator.equals(
    "created todoB should belong to member B",
    todoB.memberUser.id,
    memberBAuth.id,
  );

  const todoId_B: string & tags.Format<"uuid"> = todoB.id;

  const todoBDetail: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.at(connection, {
      todoId: todoId_B,
    });
  typia.assert(todoBDetail);

  TestValidator.equals(
    "member B can retrieve their own todo by id",
    todoBDetail.id,
    todoId_B,
  );
  TestValidator.equals(
    "todoB detail should belong to member B",
    todoBDetail.memberUser.id,
    memberBAuth.id,
  );
  TestValidator.equals(
    "todoB detail title should match creation",
    todoBDetail.title,
    todoBBody.title,
  );
  TestValidator.equals(
    "todoB detail state should match creation",
    todoBDetail.state,
    todoBBody.state,
  );
}
