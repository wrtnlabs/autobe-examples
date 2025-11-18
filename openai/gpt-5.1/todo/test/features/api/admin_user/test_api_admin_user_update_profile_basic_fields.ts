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

export async function test_api_admin_user_update_profile_basic_fields(
  connection: api.IConnection,
) {
  // 1. Register Admin A (acting administrator)
  const adminAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminAJoinBody = {
    email: adminAEmail,
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todoapp.local/join",
    referrer: "https://admin.todoapp.local/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAAuth: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert(adminAAuth);

  // 2. As Admin A, create at least one system setting
  const systemSettingBody = {
    key: `max_active_todos_per_user_${RandomGenerator.alphaNumeric(8)}`,
    value: "100",
    type: "int",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert(systemSetting);

  // 3. Still as Admin A, create Admin B
  const adminBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminBJoinBody = {
    email: adminBEmail,
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    status: "pending",
    ip: "127.0.0.1",
    href: "https://admin.todoapp.local/join",
    referrer: "https://admin.todoapp.local/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminBAuth: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert(adminBAuth);

  // Capture baseline fields for Admin B
  const adminBOriginalId = adminBAuth.id;
  const adminBOriginalEmail = adminBAuth.email;
  const adminBOriginalCreatedAt = adminBAuth.created_at;
  const adminBOriginalUpdatedAt = adminBAuth.updated_at;

  // 4. Create a member user and login, then create a todo (system has data)
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberJoinBody = {
    email: memberEmail,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://todoapp.local/signup",
    referrer: "https://todoapp.local/landing",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberJoinAuth: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberJoinAuth);

  const memberLoginBody = {
    email: memberEmail,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://todoapp.local/login",
    referrer: "https://todoapp.local/landing",
  } satisfies ITodoAppMemberUserLogin.ICreate;

  const memberLoginAuth: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuth);

  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: new Date().toISOString(),
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const todo: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody,
    });
  typia.assert(todo);

  // 5. Switch back to Admin A context by logging in again explicitly
  const adminALoginBody = {
    email: adminAEmail,
    password: adminAJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.todoapp.local/login",
    referrer: "https://admin.todoapp.local/landing",
  } satisfies ITodoAppAdminUser.ILogin;

  const adminALoginAuth: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminALoginBody,
    });
  typia.assert(adminALoginAuth);

  // 6. Update Admin B's display_name and status via PUT adminUsers/{adminUserId}
  const newDisplayName = RandomGenerator.name();
  const newStatus = "active";

  const adminBUpdateBody = {
    display_name: newDisplayName,
    status: newStatus,
  } satisfies ITodoAppAdminUser.IUpdate;

  const updatedAdminB: ITodoAppAdminUser =
    await api.functional.todoApp.adminUser.adminUsers.update(connection, {
      adminUserId: adminBOriginalId,
      body: adminBUpdateBody,
    });
  typia.assert(updatedAdminB);

  // 7. Assertions: identifiers stable, fields updated, timestamps correct
  TestValidator.equals(
    "admin B id should remain unchanged after profile update",
    updatedAdminB.id,
    adminBOriginalId,
  );

  TestValidator.equals(
    "admin B email should remain unchanged when not updated",
    updatedAdminB.email,
    adminBOriginalEmail,
  );

  TestValidator.equals(
    "admin B display_name should be updated to new value",
    updatedAdminB.display_name,
    newDisplayName,
  );

  TestValidator.equals(
    "admin B status should be updated to active",
    updatedAdminB.status,
    newStatus,
  );

  TestValidator.equals(
    "admin B created_at should remain unchanged after update",
    updatedAdminB.created_at,
    adminBOriginalCreatedAt,
  );

  TestValidator.notEquals(
    "admin B updated_at should change after profile update",
    updatedAdminB.updated_at,
    adminBOriginalUpdatedAt,
  );

  TestValidator.predicate(
    "admin B updated_at should be lexicographically greater than original updated_at",
    updatedAdminB.updated_at > adminBOriginalUpdatedAt,
  );
}
