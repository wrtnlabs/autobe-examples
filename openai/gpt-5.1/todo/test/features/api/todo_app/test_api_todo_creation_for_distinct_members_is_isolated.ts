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
 * Verify that todos created for distinct member users are isolated by
 * ownership.
 *
 * Business goal:
 *
 * - Ensure that POST /todoApp/memberUser/todos always binds the new todo to the
 *   currently authenticated member user, not to any client-controlled field.
 * - Demonstrate that two separate member accounts (Member A and Member B) each
 *   receive todos whose `memberUser` summary reflects their own identity, and
 *   that those owners differ between the two todos.
 *
 * High-level flow:
 *
 * 1. Admin joins and establishes global system settings (precondition for todo
 *    creation under the todoApp domain).
 * 2. Member A joins (and is implicitly authenticated by the join endpoint).
 * 3. While authenticated as Member A, create a todo and capture the returned
 *    ITodoAppTodo, including its embedded `memberUser` summary.
 * 4. Member B joins as a completely separate member account.
 * 5. While authenticated as Member B, create another todo with a distinct title
 *    and capture its `memberUser` summary.
 * 6. Assert that Member A and Member B have different ids and emails.
 * 7. Assert that Member A’s todo.memberUser.* matches Member A’s identity, and
 *    Member B’s todo.memberUser.* matches Member B’s identity.
 * 8. Assert that the owner summaries of the two todos differ (no ownership leakage
 *    between accounts).
 */
export async function test_api_todo_creation_for_distinct_members_is_isolated(
  connection: api.IConnection,
) {
  // 1. Admin joins to initialize an administrative actor.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/join",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create at least one system setting so the todoApp domain is configured.
  const systemSettingBody = {
    key: "max_active_todos_per_user",
    value: "100",
    type: "int",
    description:
      "Maximum number of active todos a member user can have at once.",
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert(systemSetting);

  // 3. Register Member A (join implicitly authenticates as this member).
  const memberAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberAJoinBody = {
    email: memberAEmail,
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1" as string & tags.Format<"ipv4">,
    href: "https://todo-app.test/signup" as string & tags.Format<"uri">,
    referrer: "https://todo-app.test/landing" as string & tags.Format<"uri">,
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberAAuthorized);

  // Sanity checks for Member A
  TestValidator.equals(
    "member A email must match join payload",
    memberAAuthorized.email,
    memberAEmail,
  );

  // 4. While authenticated as Member A, create their todo.
  const todoATitle = `Todo for Member A - ${RandomGenerator.paragraph({
    sentences: 2,
  })}`;

  const todoABody = {
    title: todoATitle,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    due_date: typia.random<string & tags.Format<"date-time">>(),
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const todoA: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoABody,
    });
  typia.assert(todoA);

  // Validate that todoA is owned by Member A
  TestValidator.equals(
    "todo A owner id matches Member A id",
    todoA.memberUser.id,
    memberAAuthorized.id,
  );
  TestValidator.equals(
    "todo A owner email matches Member A email",
    todoA.memberUser.email,
    memberAAuthorized.email,
  );

  // 5. Register Member B as a separate member account.
  const memberBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberBJoinBody = {
    email: memberBEmail,
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1" as string & tags.Format<"ipv4">,
    href: "https://todo-app.test/signup" as string & tags.Format<"uri">,
    referrer: "https://todo-app.test/landing" as string & tags.Format<"uri">,
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberBAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberBAuthorized);

  // Basic isolation check: Member A and Member B must be different principals.
  TestValidator.notEquals(
    "Member A id and Member B id must differ",
    memberAAuthorized.id,
    memberBAuthorized.id,
  );
  TestValidator.notEquals(
    "Member A email and Member B email must differ",
    memberAAuthorized.email,
    memberBAuthorized.email,
  );

  // 6. While authenticated as Member B, create their todo with a distinct title.
  const todoBTitle = `Todo for Member B - ${RandomGenerator.paragraph({
    sentences: 2,
  })}`;

  const todoBBody = {
    title: todoBTitle,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    due_date: typia.random<string & tags.Format<"date-time">>(),
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const todoB: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoBBody,
    });
  typia.assert(todoB);

  // Validate that todoB is owned by Member B
  TestValidator.equals(
    "todo B owner id matches Member B id",
    todoB.memberUser.id,
    memberBAuthorized.id,
  );
  TestValidator.equals(
    "todo B owner email matches Member B email",
    todoB.memberUser.email,
    memberBAuthorized.email,
  );

  // 7. Cross-check that the two todos are owned by different members.
  TestValidator.notEquals(
    "todo A and todo B must have different owner ids",
    todoA.memberUser.id,
    todoB.memberUser.id,
  );
  TestValidator.notEquals(
    "todo A and todo B must have different owner emails",
    todoA.memberUser.email,
    todoB.memberUser.email,
  );
}
