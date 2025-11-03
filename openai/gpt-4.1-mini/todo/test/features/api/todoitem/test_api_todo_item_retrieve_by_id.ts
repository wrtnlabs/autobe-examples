import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoItem";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

export async function test_api_todo_item_retrieve_by_id(
  connection: api.IConnection,
) {
  // 1. User registration (authentication) to obtain authorized user context
  const userAuthorized: ITodoUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(10),
      } satisfies ITodoUser.ICreate,
    });
  typia.assert(userAuthorized);

  // 2. Create a new todo item for the authorized user
  const createBody = {
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 8,
    }),
    status: "pending",
    due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Due date 1 day in the future
  } satisfies ITodoItem.ICreate;

  const createdTodoItem: ITodoItem =
    await api.functional.todo.user.todoItems.create(connection, {
      body: createBody,
    });
  typia.assert(createdTodoItem);
  TestValidator.equals(
    "created todo item description matches input",
    createdTodoItem.description,
    createBody.description,
  );
  TestValidator.equals(
    "created todo item status is pending",
    createdTodoItem.status,
    "pending",
  );
  if (createBody.due_date !== undefined && createBody.due_date !== null) {
    TestValidator.equals(
      "created todo item due_date matches input",
      createdTodoItem.due_date,
      createBody.due_date,
    );
  } else {
    TestValidator.equals(
      "created todo item due_date is null",
      createdTodoItem.due_date,
      null,
    );
  }

  // 3. Retrieve the created todo item by its unique ID
  const retrievedTodoItem: ITodoItem =
    await api.functional.todo.user.todoItems.at(connection, {
      todoItemId: createdTodoItem.id,
    });
  typia.assert(retrievedTodoItem);

  // Validations on retrieved todo item to ensure correctness and ownership
  TestValidator.equals(
    "retrieved todo item ID matches created",
    retrievedTodoItem.id,
    createdTodoItem.id,
  );
  TestValidator.equals(
    "retrieved todo item description matches created",
    retrievedTodoItem.description,
    createdTodoItem.description,
  );
  TestValidator.equals(
    "retrieved todo item status matches created",
    retrievedTodoItem.status,
    createdTodoItem.status,
  );
  if (
    retrievedTodoItem.due_date !== undefined &&
    retrievedTodoItem.due_date !== null
  ) {
    TestValidator.equals(
      "retrieved todo item due_date matches created",
      retrievedTodoItem.due_date,
      createdTodoItem.due_date,
    );
  } else {
    TestValidator.equals(
      "retrieved todo item due_date is null",
      retrievedTodoItem.due_date,
      null,
    );
  }
  TestValidator.predicate(
    "retrieved todo item created_at is valid ISO date",
    !isNaN(Date.parse(retrievedTodoItem.created_at)),
  );
  TestValidator.predicate(
    "retrieved todo item updated_at is valid ISO date",
    !isNaN(Date.parse(retrievedTodoItem.updated_at)),
  );
}
