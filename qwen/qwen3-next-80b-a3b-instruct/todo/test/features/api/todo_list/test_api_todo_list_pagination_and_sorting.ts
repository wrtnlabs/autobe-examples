import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodo";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
export async function test_api_todo_list_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Call the API without any parameters since it doesn't accept request body
  const response: IPageITodoListTodo.ISummary =
    await api.functional.todoList.todos.index(connection);
  typia.assert(response);
  // Validate the response structure matches the expected schema
  TestValidator.equals(
    "pagination exists",
    response.pagination !== undefined,
    true,
  );
  TestValidator.equals("data exists", response.data !== undefined, true);
  TestValidator.equals("data is an array", Array.isArray(response.data), true);
  TestValidator.predicate(
    "pagination current >= 0",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
  // For items, verify each has the required properties
  if (response.data.length > 0) {
    const sampleItem = response.data[0];
    TestValidator.equals("item has id", sampleItem.id !== undefined, true);
    TestValidator.equals(
      "item has title",
      sampleItem.title !== undefined,
      true,
    );
    TestValidator.equals(
      "item has completed",
      sampleItem.completed !== undefined,
      true,
    );
    TestValidator.equals(
      "item has created_at",
      sampleItem.created_at !== undefined,
      true,
    );
    TestValidator.predicate(
      "item id is valid UUID",
      /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(
        sampleItem.id,
      ),
    );
    TestValidator.predicate(
      "item title has content",
      sampleItem.title.length >= 1,
    );
    TestValidator.equals(
      "item completed is boolean",
      typeof sampleItem.completed === "boolean",
      true,
    );
    TestValidator.predicate(
      "item created_at is ISO format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        sampleItem.created_at,
      ),
    );
  }
}
