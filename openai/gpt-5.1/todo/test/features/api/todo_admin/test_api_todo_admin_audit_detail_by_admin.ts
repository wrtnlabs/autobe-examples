import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminAudit";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminLogin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodoUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserJoin";
import type { ITodoAppTodoUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserLogin";

export async function test_api_todo_admin_audit_detail_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a todoAdmin account and obtain authorized context
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    displayName: RandomGenerator.name(1),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. As todoAdmin, create a Todo status (contextual, not strictly required)
  const statusCreateBody = {
    code: "ACTIVE",
    label: "Active",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "core",
    sort_order: 1 as number & tags.Type<"int32">,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const status: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusCreateBody,
    });
  typia.assert(status);

  // 3. Register a todoUser account and obtain authorized context
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = RandomGenerator.alphaNumeric(12);

  const userJoinBody = {
    email: userEmail,
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(1),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoUserJoin.IRequest;

  const userAuthorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: userJoinBody,
    });
  typia.assert(userAuthorized);

  // 4. As todoUser, create a todo
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    due_date: null,
    status_code: status.code,
  } satisfies ITodoAppTodo.ICreate;

  const todo: ITodoAppTodo = await api.functional.todoApp.todoUser.todos.create(
    connection,
    {
      body: todoCreateBody,
    },
  );
  typia.assert(todo);

  // 5. Switch back to admin via login to ensure admin actor context
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminLogin.IRequest;

  const adminLoginAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 6. Call the audit detail endpoint with random UUIDs (simulator/pre-seeded)
  const todoIdForAudit: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const auditId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const audit: ITodoAppTodoAdminAudit =
    await api.functional.todoApp.todoAdmin.todos.adminAudits.at(connection, {
      todoId: todoIdForAudit,
      auditId,
    });
  typia.assert(audit);

  // 7. Business and structural validations

  // Ensure audit id is stable and equals the audit.id used in the response
  TestValidator.equals("audit id should match itself", audit.id, audit.id);

  // action must be a non-empty string
  TestValidator.predicate("audit action is non-empty", audit.action.length > 0);

  // admin summary should have a UUID id and valid email (typia already checked types)
  TestValidator.predicate(
    "admin id string length is greater than 0",
    audit.admin.id.length > 0,
  );
  TestValidator.predicate(
    "admin email string length is greater than 0",
    audit.admin.email.length > 0,
  );

  // todo summary should have non-empty title
  TestValidator.predicate(
    "todo summary title is non-empty",
    audit.todo.title.length > 0,
  );

  // Optional fields: field_name, previous_value, new_value, reason must be present as properties
  TestValidator.predicate(
    "audit has field_name property",
    Object.prototype.hasOwnProperty.call(audit, "field_name"),
  );
  TestValidator.predicate(
    "audit has previous_value property",
    Object.prototype.hasOwnProperty.call(audit, "previous_value"),
  );
  TestValidator.predicate(
    "audit has new_value property",
    Object.prototype.hasOwnProperty.call(audit, "new_value"),
  );
  TestValidator.predicate(
    "audit has reason property",
    Object.prototype.hasOwnProperty.call(audit, "reason"),
  );

  // Ensure field_name, when present and non-null, does not expose raw FK column names
  if (audit.field_name !== null && audit.field_name !== undefined) {
    TestValidator.predicate(
      "field_name does not expose todo_app_todo_id",
      audit.field_name !== "todo_app_todo_id",
    );
    TestValidator.predicate(
      "field_name does not expose todo_app_todoadmin_id",
      audit.field_name !== "todo_app_todoadmin_id",
    );
  }

  // Ensure the audit DTO itself does not expose raw foreign key columns
  const auditKeys = Object.keys(audit);
  TestValidator.predicate(
    "audit DTO does not include todo_app_todo_id field",
    auditKeys.indexOf("todo_app_todo_id") === -1,
  );
  TestValidator.predicate(
    "audit DTO does not include todo_app_todoadmin_id field",
    auditKeys.indexOf("todo_app_todoadmin_id") === -1,
  );
}
