import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";

/**
 * Test successful todo retrieval by authenticated member user.
 *
 * This test validates the complete workflow of a member user authenticating,
 * creating a personal todo item, and then retrieving that specific todo by ID
 * to verify comprehensive todo data display including title, description,
 * status, priority, category, due date, and timestamps.
 */
export async function test_api_todo_retrieval_by_member(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as member user
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ITodoAppMember.IAuthorized =
    await api.functional.auth.member.join.registerMember(connection, {
      body: {
        email: memberEmail,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies ITodoAppMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create personal todo item
  const todoTitle = RandomGenerator.paragraph({ sentences: 3 });
  const todoDescription = RandomGenerator.content({ paragraphs: 2 });
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.member.todos.create(connection, {
      body: {
        title: todoTitle,
        description: todoDescription,
        status: "pending",
        business_status: "active",
        priority: "medium",
        category: "personal",
        due_date: dueDate,
      } satisfies ITodoAppTodo.ICreate,
    });
  typia.assert(createdTodo);

  // Step 3: Retrieve specific todo by ID
  const retrievedTodo: ITodoAppTodo = await api.functional.todoApp.todos.at(
    connection,
    {
      todoId: createdTodo.id,
    },
  );
  typia.assert(retrievedTodo);

  // Step 4: Validate complete todo information
  TestValidator.equals(
    "todo title matches",
    retrievedTodo.title,
    createdTodo.title,
  );
  TestValidator.equals(
    "todo description matches",
    retrievedTodo.description,
    createdTodo.description,
  );
  TestValidator.equals("todo status matches", retrievedTodo.status, "pending");
  TestValidator.equals(
    "todo business status matches",
    retrievedTodo.business_status,
    "active",
  );
  TestValidator.equals(
    "todo priority matches",
    retrievedTodo.priority,
    "medium",
  );
  TestValidator.equals(
    "todo category matches",
    retrievedTodo.category,
    "personal",
  );
  TestValidator.equals(
    "todo due date matches",
    retrievedTodo.due_date,
    dueDate,
  );
  TestValidator.equals("todo ID matches", retrievedTodo.id, createdTodo.id);

  // Validate timestamps
  TestValidator.equals(
    "todo created_at matches",
    retrievedTodo.created_at,
    createdTodo.created_at,
  );
  TestValidator.equals(
    "todo updated_at matches",
    retrievedTodo.updated_at,
    createdTodo.updated_at,
  );
  TestValidator.equals(
    "todo completed_at is null",
    retrievedTodo.completed_at,
    null,
  );
  TestValidator.equals(
    "todo deleted_at is null",
    retrievedTodo.deleted_at,
    null,
  );

  // Step 5: Verify proper access control
  TestValidator.predicate(
    "member can access their own todo",
    retrievedTodo.id === createdTodo.id &&
      retrievedTodo.title === createdTodo.title,
  );
}
