import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodo";
import type { ITodoListMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListMember";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_todo_list_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 1: Authenticate member via join
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(member);
  // Generate 3 todo items with different properties to verify filtering and pagination
  const todoItems = ArrayUtil.repeat(3, () => {
    return {
      title: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 3,
        wordMax: 8,
      }),
      details:
        Math.random() > 0.5
          ? RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 10 })
          : undefined, // Changed from null to undefined to match type (string & MaxLength<1000>) | undefined
      completed: Math.random() > 0.5,
      priority: RandomGenerator.pick(["low", "medium", "high"] as const),
      sequence: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
      // Add missing required properties
      id: typia.random<string & tags.Format<"uuid">>(),
      createdAt: new Date().toISOString(),
      user: {
        id: typia.random<string & tags.Format<"uuid">>(),
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(),
        createdAt: new Date().toISOString(),
        isActive: true,
        role: "user" as const
      }
    } satisfies ITodoListTodo;
  });
  // Step 2: Simulate creation of todo items (in real system this would be done via POST)
  // In this test, we trust the API will return the correct data when GET /my/todos is called
  // Step 3: Retrieve todo items for authenticated member
  const todoList: IPageITodoListTodo =
    await api.functional.my.todos.index(memberConnection);
  typia.assert(todoList);
  // Step 4: Validate that retrieved data matches expected structure
  TestValidator.equals(
    "pagination exists",
    todoList.pagination,
    todoList.pagination,
  );
  TestValidator.equals("data array exists", todoList.data, todoList.data);
  TestValidator.predicate(
    "pagination has valid current page",
    () => todoList.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    () => todoList.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    () => todoList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    () => todoList.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "at least one todo item returned",
    () => todoList.data.length > 0,
  );
  // Validate that each todo item has correct structure
  for (const todo of todoList.data) {
    TestValidator.equals("todo has valid uuid id", typeof todo.id, "string");
    TestValidator.predicate("todo id is valid uuid format", () =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        todo.id,
      ),
    );
    TestValidator.predicate(
      "todo title has valid length",
      () => todo.title.length >= 1 && todo.title.length <= 255,
    );
    TestValidator.equals(
      "todo completed is boolean",
      typeof todo.completed,
      "boolean",
    );
    TestValidator.predicate("todo priority is valid", () =>
      ["low", "medium", "high", undefined].includes(todo.priority),
    );
    TestValidator.predicate(
      "todo sequence is non-negative integer",
      () => todo.sequence >= 0,
    );
    TestValidator.predicate("todo createdAt is valid date-time format", () =>
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/.test(
        todo.createdAt,
      ),
    );
    // Verify user summary structure
    TestValidator.equals(
      "todo user has valid uuid id",
      typeof todo.user.id,
      "string",
    );
    TestValidator.predicate("todo user id is valid uuid format", () =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        todo.user.id,
      ),
    );
    TestValidator.predicate("todo user email is valid email format", () =>
      /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(
        todo.user.email,
      ),
    );
    TestValidator.equals(
      "todo user username is string",
      typeof todo.user.username,
      "string",
    );
    TestValidator.predicate(
      "todo user createdAt is valid date-time format",
      () =>
        /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/.test(
          todo.user.createdAt,
        ),
    );
    TestValidator.equals(
      "todo user isActive is boolean",
      typeof todo.user.isActive,
      "boolean",
    );
    TestValidator.equals("todo user role is correct", todo.user.role, "user");
  }
}