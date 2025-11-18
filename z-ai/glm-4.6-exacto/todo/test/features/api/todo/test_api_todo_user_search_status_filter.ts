import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test searching todos by each permissible business status (active, completed,
 * deleted) for a user on the PATCH /todoApp/user/todos endpoint. The scenario
 * verifies that only todos matching the selected status for the authenticated
 * user are returned. For each status, ensure appropriate field values (e.g.,
 * completed_at for completed todos, deleted_at for deleted) are present or
 * absent according to business logic.
 */
export async function test_api_todo_user_search_status_filter(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email = typia.random<string & tags.Format<"email">>();
  const password = "TestPwd456!";
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email,
        password: password as string &
          tags.MinLength<8> &
          tags.MaxLength<72> &
          tags.Format<"password">,
        href: "https://example.com/register",
        referrer: "https://example.com/welcome",
        ip: undefined,
      },
    },
  );
  typia.assert(user);
  TestValidator.equals("joined user's email matches", user.email, email);

  // For isolation, assume system pre-seeds todos with various statuses under this user.
  // Test all three statuses: 'active', 'completed', 'deleted'
  const statuses = ["active", "completed", "deleted"] as const;
  for (const status of statuses) {
    const resp: IPageITodoAppTodo.ISummary =
      await api.functional.todoApp.user.todos.index(connection, {
        body: { status } satisfies ITodoAppTodo.IRequest,
      });
    typia.assert(resp);
    TestValidator.equals(
      `todos should match requested status: ${status}`,
      resp.data.every((it) => it.status === status),
      true,
    );
    // Field checks by status
    for (const todo of resp.data) {
      if (status === "completed") {
        TestValidator.predicate(
          "completed_at is present and not null for completed",
          todo.completed_at !== null && todo.completed_at !== undefined,
        );
        TestValidator.equals(
          "deleted_at is absent or null for completed",
          todo.deleted_at ?? null,
          null,
        );
      } else if (status === "deleted") {
        TestValidator.predicate(
          "deleted_at is present and not null for deleted",
          todo.deleted_at !== null && todo.deleted_at !== undefined,
        );
      } else if (status === "active") {
        TestValidator.equals(
          "completed_at is absent or null for active",
          todo.completed_at ?? null,
          null,
        );
        TestValidator.equals(
          "deleted_at is absent or null for active",
          todo.deleted_at ?? null,
          null,
        );
      }
    }
  }
}
