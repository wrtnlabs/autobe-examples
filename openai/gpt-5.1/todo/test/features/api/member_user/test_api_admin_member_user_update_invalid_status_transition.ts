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

export async function test_api_admin_member_user_update_invalid_status_transition(
  connection: api.IConnection,
) {
  // 1. Register an admin user (also authenticates the admin via token header side-effect)
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/join",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuthorized);

  // 2. As admin, create a system setting that conceptually controls status rules
  const systemSettingCreateBody = {
    key: "member_status_policy",
    value: "no_invalid_status_string",
    type: "string",
    description: "Disallow invalid member status values.",
    group: "member_rules",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingCreateBody,
    });
  typia.assert(systemSetting);

  // 3. Register a member user and log them in to create realistic usage state
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://todo-app.test/signup",
    referrer: "https://todo-app.test/landing",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAuthorizedFromJoin: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedFromJoin);

  const memberId: string & tags.Format<"uuid"> = memberAuthorizedFromJoin.id;

  // Explicit member login to simulate separate authentication step and ensure tokens
  const memberLoginBody = {
    email: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://todo-app.test/login",
    referrer: "https://todo-app.test/landing",
  } satisfies ITodoAppMemberUserLogin.ICreate;

  const memberAuthorizedFromLogin: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedFromLogin);

  // 4. As member, create at least one todo to put the account into active state
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(createdTodo);

  TestValidator.equals(
    "todo owner should be the joined member",
    createdTodo.memberUser.id,
    memberId,
  );

  // 5. Switch back to admin context to attempt invalid status update
  const adminLoginBody = {
    email: adminJoinInput.email,
    password: adminJoinInput.password,
    ip: null,
    href: "https://admin.todo-app.test/login",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppAdminUser.ILogin;

  const adminAuthorizedFromLogin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  // 6. Attempt to update member with an invalid status value
  const invalidUpdateBody = {
    // use a clearly invalid status string to try to trigger domain rule violation
    status: "__invalid_status_transition__",
  } satisfies ITodoAppMemberUser.IUpdate;

  await TestValidator.error(
    "invalid member status transition should be rejected",
    async () => {
      await api.functional.todoApp.adminUser.memberUsers.update(connection, {
        memberUserId: memberId,
        body: invalidUpdateBody,
      });
    },
  );

  // 7. Perform a valid status update to verify the endpoint works with allowed values
  const validUpdateBody = {
    status: "active",
  } satisfies ITodoAppMemberUser.IUpdate;

  const updatedMember: ITodoAppMemberUser =
    await api.functional.todoApp.adminUser.memberUsers.update(connection, {
      memberUserId: memberId,
      body: validUpdateBody,
    });
  typia.assert(updatedMember);

  TestValidator.equals(
    "updated member id should match target member",
    updatedMember.id,
    memberId,
  );
  TestValidator.equals(
    "member status should reflect valid update",
    updatedMember.status,
    validUpdateBody.status,
  );
}
