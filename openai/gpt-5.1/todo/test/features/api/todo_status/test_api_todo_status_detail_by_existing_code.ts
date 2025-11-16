import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";

/**
 * Validate retrieving a Todo status detail by an existing business status code.
 *
 * Business workflow:
 *
 * 1. Register a todoAdmin via /auth/todoAdmin/join to obtain an authenticated
 *    admin context.
 * 2. As the authenticated todoAdmin, create a new Todo status catalogue entry with
 *    a known `code`.
 * 3. Call the public detail endpoint /todoApp/todoStatuses/{statusCode} using that
 *    `code`.
 * 4. Ensure the returned ITodoAppTodoStatus exactly reflects the created
 *    configuration (code, label, description, group, sort_order, is_default,
 *    is_active, and lifecycle timestamps).
 */
export async function test_api_todo_status_detail_by_existing_code(
  connection: api.IConnection,
) {
  // 1. Register a todoAdmin (join) to establish authenticated admin context
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password-1234",
    displayName: RandomGenerator.name(1),
    ip: null,
    href: "https://admin.todo-app.local/register",
    referrer: "https://admin.todo-app.local/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const adminAuthorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinRequestBody,
    });
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a Todo status via admin endpoint with a known business code
  const statusCode: string = `STATUS_${RandomGenerator.alphaNumeric(8)}`;

  const createBody = {
    code: statusCode,
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    group: "core",
    sort_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >() satisfies number as number,
    is_default: false,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const createdStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: createBody,
    });
  typia.assert<ITodoAppTodoStatus>(createdStatus);

  // 3. Retrieve the Todo status by its business code using public endpoint
  const fetchedStatus: ITodoAppTodoStatus =
    await api.functional.todoApp.todoStatuses.at(connection, {
      statusCode,
    });
  typia.assert<ITodoAppTodoStatus>(fetchedStatus);

  // 4. Validate that fetched status matches the created one for core fields
  TestValidator.equals(
    "todo status code should match between created and fetched",
    fetchedStatus.code,
    createdStatus.code,
  );
  TestValidator.equals(
    "todo status label should match between created and fetched",
    fetchedStatus.label,
    createdStatus.label,
  );
  TestValidator.equals(
    "todo status description should match between created and fetched",
    fetchedStatus.description,
    createdStatus.description,
  );
  TestValidator.equals(
    "todo status group should match between created and fetched",
    fetchedStatus.group,
    createdStatus.group,
  );
  TestValidator.equals(
    "todo status sort_order should match between created and fetched",
    fetchedStatus.sort_order,
    createdStatus.sort_order,
  );
  TestValidator.equals(
    "todo status is_default should match between created and fetched",
    fetchedStatus.is_default,
    createdStatus.is_default,
  );
  TestValidator.equals(
    "todo status is_active should match between created and fetched",
    fetchedStatus.is_active,
    createdStatus.is_active,
  );

  // Also ensure lifecycle timestamps exist and are consistent in type
  TestValidator.predicate(
    "created_at should be a non-empty string",
    fetchedStatus.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be a non-empty string",
    fetchedStatus.updated_at.length > 0,
  );

  // deleted_at may be null/undefined for fresh row; just ensure equality
  TestValidator.equals(
    "todo status deleted_at should match between created and fetched",
    fetchedStatus.deleted_at ?? null,
    createdStatus.deleted_at ?? null,
  );
}
