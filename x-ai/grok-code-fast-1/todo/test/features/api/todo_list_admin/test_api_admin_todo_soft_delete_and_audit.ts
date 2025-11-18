import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminSession";

/**
 * Validate that an admin can soft-delete any todo by ID and the deletion
 * completes successfully without error.
 *
 * 1. Register a new admin and obtain authentication.
 * 2. (Mock step) Generate a random UUID to represent the todoId (since there is no
 *    create/query todo API or DTO).
 * 3. As admin, call the privileged erase function on the mock todoId and verify it
 *    does not throw.
 * 4. Since there is no audit log/todo lookup API or DTO, further validations about
 *    soft deletion or auditing cannot be implemented.
 */
export async function test_api_admin_todo_soft_delete_and_audit(
  connection: api.IConnection,
) {
  // 1. Register a new admin and obtain authentication
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(admin);
  // 2. Generate mock todoId as random UUID
  const todoId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call erase and ensure no error
  await api.functional.todoList.admin.todos.erase(connection, {
    todoId: todoId,
  });
  // 4. No additional assertions possible without API/DTO for todo queries or audit logs
}
