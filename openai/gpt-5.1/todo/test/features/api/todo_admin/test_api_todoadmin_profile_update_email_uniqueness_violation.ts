import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";

export async function test_api_todoadmin_profile_update_email_uniqueness_violation(
  connection: api.IConnection,
) {
  // 1. Register first admin (adminA) with a deterministic email
  const adminAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminAJoinBody = {
    email: adminAEmail,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.todoapp.local/join",
    referrer: "https://admin.todoapp.local/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert(adminAAuthorized);

  // 2. With adminA authenticated (token auto-installed), create one Todo status
  const statusCreateBody = {
    code: "ACTIVE",
    label: "Active",
    description: "Active todo item status",
    group: "core",
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const createdStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusCreateBody,
    });
  typia.assert(createdStatus);

  // 3. Register second admin (adminB) with a different email
  const adminBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminBJoinBody = {
    email: adminBEmail,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.todoapp.local/join",
    referrer: "https://admin.todoapp.local/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminBAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert(adminBAuthorized);

  // 4. Attempt to update adminB's email to adminA's email – expect validation error
  const conflictingUpdateBody = {
    email: adminAEmail,
  } satisfies ITodoAppTodoAdmin.IUpdate;

  await TestValidator.error(
    "updating todoAdmin email to an already used email should fail",
    async () => {
      await api.functional.todoApp.todoAdmin.todoAdmins.update(connection, {
        todoAdminId: adminBAuthorized.id,
        body: conflictingUpdateBody,
      });
    },
  );
}
