import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test retrieval of a todo with full metadata validation.
 *
 * This test validates that a todo item can be created and subsequently
 * retrieved with all fields intact. The scenario covers:
 *
 * 1. User registration to obtain authentication
 * 2. Todo creation with title, description, priority, and due date
 * 3. Todo retrieval to verify all fields and metadata
 * 4. Validation of data integrity and timestamp management
 *
 * The test ensures that:
 *
 * - All todo fields are correctly stored and retrieved
 * - Timestamps show proper progression (created_at before updated_at)
 * - Priority and due date information is preserved
 * - Initial completion state is properly set to false
 * - Retrieved data structure matches expected type
 */
export async function test_api_todo_retrieval_completed_todo(
  connection: api.IConnection,
) {
  // 1. Register a new user to obtain authentication token
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // 2. Create a todo item with title, description, and metadata
  const todoTitle = RandomGenerator.paragraph({ sentences: 3 });
  const todoDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 10,
  });
  const todoPriority = RandomGenerator.pick(["low", "medium", "high"] as const);
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const createdTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.create(connection, {
      body: {
        title: todoTitle,
        description: todoDescription,
        priority: todoPriority,
        due_date: dueDate,
      } satisfies ITodoListTodo.ICreate,
    });
  typia.assert(createdTodo);

  // 3. Verify initial todo state after creation
  TestValidator.predicate(
    "todo should be initially pending",
    createdTodo.completed === false,
  );
  TestValidator.equals(
    "todo title should match created title",
    createdTodo.title,
    todoTitle,
  );
  TestValidator.equals(
    "todo description should match created description",
    createdTodo.description,
    todoDescription,
  );
  TestValidator.equals(
    "todo priority should match created priority",
    createdTodo.priority,
    todoPriority,
  );

  // 4. Retrieve the todo by ID
  const retrievedTodo: ITodoListTodo =
    await api.functional.todoList.user.todos.at(connection, {
      todoId: createdTodo.id,
    });
  typia.assert(retrievedTodo);

  // 5. Validate retrieved todo matches created todo exactly
  TestValidator.equals(
    "retrieved todo ID matches created todo ID",
    retrievedTodo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "retrieved todo title matches created title",
    retrievedTodo.title,
    createdTodo.title,
  );
  TestValidator.equals(
    "retrieved todo description matches created description",
    retrievedTodo.description,
    createdTodo.description,
  );
  TestValidator.equals(
    "retrieved todo priority matches created priority",
    retrievedTodo.priority,
    createdTodo.priority,
  );
  TestValidator.equals(
    "retrieved todo due_date matches created due_date",
    retrievedTodo.due_date,
    createdTodo.due_date,
  );

  // 6. Validate timestamp fields are properly set
  TestValidator.predicate(
    "created_at should be present",
    retrievedTodo.created_at !== null && retrievedTodo.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at should be present",
    retrievedTodo.updated_at !== null && retrievedTodo.updated_at !== undefined,
  );

  // 7. Validate timestamp progression (created before or equal to updated)
  const createdTime = new Date(retrievedTodo.created_at).getTime();
  const updatedTime = new Date(retrievedTodo.updated_at).getTime();
  TestValidator.predicate(
    "created_at should be before or equal to updated_at",
    createdTime <= updatedTime,
  );

  // 8. Validate completion state for pending todo
  TestValidator.equals(
    "completed field should be false for newly created todo",
    retrievedTodo.completed,
    false,
  );
  TestValidator.predicate(
    "completed_at should be null for pending todo",
    retrievedTodo.completed_at === null ||
      retrievedTodo.completed_at === undefined,
  );

  // 9. Validate all identifier fields
  TestValidator.predicate(
    "todo ID is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedTodo.id,
    ),
  );
  TestValidator.predicate(
    "todo title is non-empty",
    retrievedTodo.title.length > 0 && retrievedTodo.title.length <= 255,
  );
}
