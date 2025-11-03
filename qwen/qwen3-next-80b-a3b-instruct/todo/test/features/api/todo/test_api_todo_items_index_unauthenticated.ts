import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoItem";
import type { ITodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoItem";

export async function test_api_todo_items_index_unauthenticated(
  connection: api.IConnection,
) {
  await TestValidator.error(
    "unauthenticated user should receive 401 Unauthorized",
    async () => {
      await api.functional.todo.user.todoItems.index(connection, {
        body: {
          page: 1,
          limit: 25,
        } satisfies ITodoItem.IRequest,
      });
    },
  );
}
