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
 * Validate creation of todos with different combinations of optional fields.
 *
 * Business goal:
 *
 * - Ensure that the todo creation API correctly handles optional `description`
 *   and `due_date` fields when they are provided, omitted, or explicitly set to
 *   null.
 * - Confirm that system bootstrap via admin user and system settings does not
 *   block member-level todo creation.
 *
 * Scenario steps:
 *
 * 1. Bootstrap an admin user and ensure at least one ITodoAppSystemSetting exists
 *    using api.functional.todoApp.adminUser.systemSettings.create.
 * 2. Register a member user via api.functional.auth.memberUser.join.
 * 3. Using the authenticated member session, create: 3-1. A todo with title,
 *    state, non-null description, and non-null due_date. 3-2. A todo with title
 *    and state, but `description: null` and `due_date: null` explicitly. 3-3. A
 *    todo with title and state where only `description` is non-null and
 *    `due_date` is null (or vice versa) to validate field-level optionality.
 * 4. For each created todo, assert that:
 *
 *    - The response type matches ITodoAppTodo (using typia.assert).
 *    - The echo of title and state matches the request.
 *    - The nullable fields reflect the values sent: non-null strings when provided
 *         and null when explicitly set to null.
 *    - For non-null `due_date`, the value is a syntactically valid ISO-8601
 *         date-time string (already guaranteed by typia.assert, so we rely on
 *         that).
 */
export async function test_api_todo_creation_with_optional_fields_variations(
  connection: api.IConnection,
) {
  // 1. Bootstrap admin user and system setting
  const adminEmail: string = typia.random<string & tags.Format<"email">>();

  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todo-app.test/signup",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppAdminUser.IJoin;

  const adminAuthorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminAuthorized);

  // Create a baseline system setting to ensure configuration exists
  const systemSettingBody = {
    key: "max_active_todos_per_user",
    value: "100",
    type: "int",
    description: "Maximum number of active todos per member user for tests",
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting: ITodoAppSystemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: systemSettingBody,
    });
  typia.assert<ITodoAppSystemSetting>(systemSetting);
  TestValidator.equals(
    "system setting key is correctly stored",
    systemSetting.key,
    systemSettingBody.key,
  );

  // 2. Register a member user via /auth/memberUser/join
  const memberEmail: string = typia.random<string & tags.Format<"email">>();

  const memberJoinBody = {
    email: memberEmail,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1" as string & tags.Format<"ipv4">,
    href: "https://todo-app.test/signup" as string & tags.Format<"uri">,
    referrer: "https://todo-app.test/landing" as string & tags.Format<"uri">,
  } satisfies ITodoAppMemberUserJoin.ICreate;

  const memberAuthorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ITodoAppMemberUser.IAuthorized>(memberAuthorized);

  // 3-1. Create todo with non-null description and non-null due_date
  const dueDate1: string & tags.Format<"date-time"> = new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  const todoCreateBody1 = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    due_date: dueDate1,
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const todo1: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody1,
    });
  typia.assert<ITodoAppTodo>(todo1);

  TestValidator.equals("todo1 title echo", todo1.title, todoCreateBody1.title);
  TestValidator.equals("todo1 state echo", todo1.state, todoCreateBody1.state);
  TestValidator.equals(
    "todo1 description non-null echo",
    todo1.description,
    todoCreateBody1.description,
  );
  TestValidator.equals(
    "todo1 due_date non-null echo",
    todo1.due_date,
    todoCreateBody1.due_date,
  );

  // 3-2. Create todo with description and due_date explicitly null
  const todoCreateBody2 = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: null,
    due_date: null,
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const todo2: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody2,
    });
  typia.assert<ITodoAppTodo>(todo2);

  TestValidator.equals("todo2 title echo", todo2.title, todoCreateBody2.title);
  TestValidator.equals("todo2 state echo", todo2.state, todoCreateBody2.state);
  TestValidator.equals(
    "todo2 description is null",
    todo2.description,
    todoCreateBody2.description,
  );
  TestValidator.equals(
    "todo2 due_date is null",
    todo2.due_date,
    todoCreateBody2.due_date,
  );

  // 3-3. Mixed optionality: description non-null, due_date null
  const todoCreateBody3 = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    due_date: null,
    state: "active",
  } satisfies ITodoAppTodo.ICreate;

  const todo3: ITodoAppTodo =
    await api.functional.todoApp.memberUser.todos.create(connection, {
      body: todoCreateBody3,
    });
  typia.assert<ITodoAppTodo>(todo3);

  TestValidator.equals("todo3 title echo", todo3.title, todoCreateBody3.title);
  TestValidator.equals("todo3 state echo", todo3.state, todoCreateBody3.state);
  TestValidator.equals(
    "todo3 description non-null echo",
    todo3.description,
    todoCreateBody3.description,
  );
  TestValidator.equals(
    "todo3 due_date is null",
    todo3.due_date,
    todoCreateBody3.due_date,
  );

  // Additionally validate that created todos belong to the authenticated member
  TestValidator.equals(
    "todo1 owner matches member",
    todo1.memberUser.id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "todo2 owner matches member",
    todo2.memberUser.id,
    memberAuthorized.id,
  );
  TestValidator.equals(
    "todo3 owner matches member",
    todo3.memberUser.id,
    memberAuthorized.id,
  );
}
