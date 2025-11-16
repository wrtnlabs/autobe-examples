import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import type { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";

/**
 * Validate that requesting a non-existent todoAdmin detail returns an error and
 * does not leak any existing administrator data.
 *
 * Business flow:
 *
 * 1. Register a todoAdmin through /auth/todoAdmin/join to obtain an authenticated
 *    admin context.
 * 2. As that admin, create at least one Todo status through
 *    /todoApp/todoAdmin/todoStatuses to satisfy catalogue prerequisites.
 * 3. Generate a UUID different from the real admin id, so it certainly does not
 *    correspond to an existing admin.
 * 4. Call GET /todoApp/todoAdmin/todoAdmins/{todoAdminId} with the nonexistent
 *    UUID.
 * 5. Assert that the request fails using TestValidator.error, without asserting a
 *    specific HTTP status code, ensuring that no admin detail payload is
 *    returned.
 */
export async function test_api_todoadmin_detail_view_not_found(
  connection: api.IConnection,
) {
  // 1. Register a todoAdmin (join) to obtain authorized admin context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: null,
    href: "https://admin.todo-app.test/join",
    referrer: "https://admin.todo-app.test/landing",
  } satisfies ITodoAppTodoAdminJoin.IRequest;

  const authorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create at least one Todo status as prerequisite catalogue data.
  const statusBody = {
    code: `STATUS_${RandomGenerator.alphaNumeric(8)}`,
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "core",
    sort_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >() satisfies number as number,
    is_default: false,
    is_active: true,
  } satisfies ITodoAppTodoStatus.ICreate;

  const status: ITodoAppTodoStatus =
    await api.functional.todoApp.todoAdmin.todoStatuses.create(connection, {
      body: statusBody,
    });
  typia.assert(status);

  // 3. Generate a definitely non-existent todoAdmin UUID.
  const existingAdminId: string & tags.Format<"uuid"> = authorized.id;
  let nonexistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (nonexistentId === existingAdminId) {
    nonexistentId = typia.random<string & tags.Format<"uuid">>();
  }

  // 4 & 5. Call the detail endpoint with the nonexistent UUID and assert
  //         that it responds with an error (not-found style) without
  //         validating any specific HTTP status code.
  await TestValidator.error(
    "requesting non-existent todoAdmin should fail",
    async () => {
      await api.functional.todoApp.todoAdmin.todoAdmins.at(connection, {
        todoAdminId: nonexistentId,
      });
    },
  );
}
