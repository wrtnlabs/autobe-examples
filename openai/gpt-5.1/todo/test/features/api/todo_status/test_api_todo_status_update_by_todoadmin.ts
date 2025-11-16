import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";

/**
 * Validate that an authenticated todoAdmin can update an existing Todo status
 * by its business key `statusCode`, and that authorization, path binding, and
 * immutable fields behave correctly.
 *
 * Business flow:
 *
 * 1. Register a new todoAdmin using /auth/todoAdmin/join. This also sets the
 *    Authorization header on the shared connection with an access token.
 * 2. Using the authenticated admin connection, create a new Todo status via POST
 *    /todoApp/todoAdmin/todoStatuses with a specific `code`, `label`,
 *    `sort_order`, `is_default`, and `is_active`.
 * 3. With the same admin context, call PUT
 *    /todoApp/todoAdmin/todoStatuses/{statusCode} targeting the created status
 *    by its `code` and providing an ITodoAppTodoStatus.IUpdate body that
 *    changes multiple mutable fields.
 * 4. Assert that the update succeeds, returned ITodoAppTodoStatus passes
 *    typia.assert, and that:
 *
 *    - Id, code, and created_at are preserved.
 *    - Label, description, group, sort_order, is_default, is_active reflect the
 *         requested updates.
 *    - Updated_at differs from the original value (has advanced).
 * 5. Derive an unauthenticated connection with empty headers and attempt the same
 *    update call, expecting it to fail due to missing Authorization. Validate
 *    this with TestValidator.error without inspecting HTTP status.
 */
export async function test_api_todo_status_update_by_todoadmin(
  connection: api.IConnection,
) {
  // 1. Register a new todoAdmin and obtain authorized context
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const authorizedAdmin: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinRequestBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Create baseline Todo status
  const baseCode: string = `STATUS_${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const createBody = {
    code: baseCode,
    label: "Active Todos",
    description: "Status representing active and ongoing Todo items.",
    group: "core",
    sort_order: 10,
    is_default: true,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const createdStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: createBody,
    });
  typia.assert(createdStatus);

  // 3. Prepare update payload targeting the created status by its code
  const updateStatusCode: string = createdStatus.code;

  const updateBody = {
    label: "In Progress Todos",
    description: "Status for Todos that are currently being worked on.",
    group: "workflow",
    sort_order: 20,
    is_default: false,
    is_active: true,
  } satisfies ITodoAppTodoStatus.IUpdate;

  const updatedStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.update(connection, {
      statusCode: updateStatusCode,
      body: updateBody,
    });
  typia.assert(updatedStatus);

  // 4. Data integrity assertions
  // Immutable fields: id, code, created_at
  TestValidator.equals(
    "status id must remain unchanged after update",
    updatedStatus.id,
    createdStatus.id,
  );
  TestValidator.equals(
    "status code must match path parameter and remain unchanged",
    updatedStatus.code,
    updateStatusCode,
  );
  TestValidator.equals(
    "status created_at must remain unchanged after update",
    updatedStatus.created_at,
    createdStatus.created_at,
  );

  // Mutable fields: reflect the update payload
  TestValidator.equals(
    "label should be updated to new value",
    updatedStatus.label,
    updateBody.label,
  );
  TestValidator.equals(
    "description should reflect updated value (including nullability)",
    updatedStatus.description ?? null,
    updateBody.description ?? null,
  );
  TestValidator.equals(
    "group should reflect updated grouping",
    updatedStatus.group ?? null,
    updateBody.group ?? null,
  );
  TestValidator.equals(
    "sort_order should be updated to new integer value",
    updatedStatus.sort_order,
    updateBody.sort_order as number,
  );
  TestValidator.equals(
    "is_default flag should reflect update payload",
    updatedStatus.is_default,
    updateBody.is_default,
  );
  TestValidator.equals(
    "is_active flag should reflect update payload",
    updatedStatus.is_active,
    updateBody.is_active,
  );

  // updated_at should have changed compared to the original value
  TestValidator.notEquals(
    "updated_at should change after status update",
    updatedStatus.updated_at,
    createdStatus.updated_at,
  );

  // 5. Negative case: unauthenticated update attempt must fail
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated todoAdmin update must fail due to missing Authorization",
    async () => {
      await api.functional.todoApp.todoAdmin.todoStatuses.update(
        unauthenticatedConnection,
        {
          statusCode: updateStatusCode,
          body: updateBody,
        },
      );
    },
  );
}
