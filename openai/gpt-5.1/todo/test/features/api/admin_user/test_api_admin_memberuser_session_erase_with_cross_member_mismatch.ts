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

export async function test_api_admin_memberuser_session_erase_with_cross_member_mismatch(
  connection: api.IConnection,
) {
  // 1. Bootstrap: create an admin and a basic system setting
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphabets(16);

  const joinedAdmin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
        status: "active",
        ip: "127.0.0.1",
        href: "https://admin.todo-app.local/join",
        referrer: "https://admin.todo-app.local/",
      } satisfies ITodoAppAdminUser.IJoin,
    });
  typia.assert(joinedAdmin);

  const setting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: {
        key: "max_active_todos_per_user",
        value: "100",
        type: "int",
        description: "Maximum number of active todos per member user for tests",
        group: "limits",
        enabled: true,
      } satisfies ITodoAppSystemSetting.ICreate,
    });
  typia.assert(setting);

  // 2. Create member user A
  const memberAEmail: string = typia.random<string & tags.Format<"email">>();
  const memberAPassword: string = RandomGenerator.alphabets(16);

  const memberA: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        email: memberAEmail,
        password: memberAPassword,
        displayName: RandomGenerator.name(),
        ip: null,
        href: "https://todo-app.local/signup",
        referrer: "https://todo-app.local/landing",
      } satisfies ITodoAppMemberUserJoin.ICreate,
    });
  typia.assert(memberA);

  // member A creates a todo to prove session works
  const todoA1: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 6 }),
        due_date: null,
        state: "active",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(todoA1);
  TestValidator.equals(
    "member A first todo is owned by member A",
    todoA1.memberUser.id,
    memberA.id,
  );

  // 3. Create member user B
  const memberBEmail: string = typia.random<string & tags.Format<"email">>();
  const memberBPassword: string = RandomGenerator.alphabets(16);

  const memberB: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        email: memberBEmail,
        password: memberBPassword,
        displayName: RandomGenerator.name(),
        ip: null,
        href: "https://todo-app.local/signup",
        referrer: "https://todo-app.local/landing",
      } satisfies ITodoAppMemberUserJoin.ICreate,
    });
  typia.assert(memberB);

  const todoB1: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        due_date: null,
        state: "active",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(todoB1);
  TestValidator.equals(
    "member B first todo is owned by member B",
    todoB1.memberUser.id,
    memberB.id,
  );

  // 4. Switch back to admin context with a login (fresh session)
  const reloggedAdmin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: "127.0.0.1",
        href: "https://admin.todo-app.local/login",
        referrer: "https://admin.todo-app.local/",
      } satisfies ITodoAppAdminUser.ILogin,
    });
  typia.assert(reloggedAdmin);

  // 5. Cross-member mismatch erase attempt: use member B id with arbitrary UUID
  const fakeSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "admin cannot erase a session by specifying mismatched member user id",
    async () => {
      await api.functional.todoApp.adminUser.memberUsers.sessions.erase(
        connection,
        {
          memberUserId: memberB.id,
          sessionId: fakeSessionId,
        },
      );
    },
  );

  // 6. Verify member sessions still work after failed erase attempt
  // Switch to member A and create another todo
  const reloggedMemberA: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        email: memberAEmail,
        password: memberAPassword,
        ip: null,
        href: "https://todo-app.local/login",
        referrer: "https://todo-app.local/landing",
      } satisfies ITodoAppMemberUserLogin.ICreate,
    });
  typia.assert(reloggedMemberA);
  TestValidator.equals(
    "relogged member A identity remains consistent",
    reloggedMemberA.id,
    memberA.id,
  );

  const todoA2: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 4 }),
        due_date: null,
        state: "active",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(todoA2);
  TestValidator.equals(
    "member A second todo is also owned by member A",
    todoA2.memberUser.id,
    memberA.id,
  );

  // Switch to member B and create another todo
  const reloggedMemberB: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        email: memberBEmail,
        password: memberBPassword,
        ip: null,
        href: "https://todo-app.local/login",
        referrer: "https://todo-app.local/landing",
      } satisfies ITodoAppMemberUserLogin.ICreate,
    });
  typia.assert(reloggedMemberB);
  TestValidator.equals(
    "relogged member B identity remains consistent",
    reloggedMemberB.id,
    memberB.id,
  );

  const todoB2: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 4 }),
        due_date: null,
        state: "active",
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(todoB2);
  TestValidator.equals(
    "member B second todo is also owned by member B",
    todoB2.memberUser.id,
    memberB.id,
  );
}
