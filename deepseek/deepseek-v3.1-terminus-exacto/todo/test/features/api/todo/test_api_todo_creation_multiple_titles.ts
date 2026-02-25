import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_todo_app_user_todos_create } from "../../../generate/generate_random_todo_app_user_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_creation_multiple_titles(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authorized user connection
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {});
  typia.assert(authorizedUser);
  // 2. Define test titles with various characteristics
  const testTitles = [
    "Buy milk", // Short descriptive title
    "Complete the monthly financial report by Friday EOD", // Medium length
    "Plan and organize the quarterly team building event including venue booking, catering arrangements, activity coordination, and attendance confirmation", // Long detailed description
    "Urgent! Meeting @ 2:00 PM - Conference Room #A-102", // Special characters and punctuation
    "Task 42: Update v1.3.7 release notes (Fix #789, #812)", // Numbers and mixed content
  ] satisfies string[];
  // 3. Create todos with different titles
  const createdTodos: ITodoAppTodo[] = [];
  for (const title of testTitles) {
    const todo = await generate_random_todo_app_user_todos_create(
      userConnection,
      {
        body: { title } satisfies ITodoAppTodo.ICreate,
      },
    );
    typia.assert(todo);
    createdTodos.push(todo);
  }
  // 4. Validate each todo's title matches the exact input
  for (let i = 0; i < testTitles.length; i++) {
    TestValidator.equals(
      `todo ${i + 1} title should match exactly`,
      createdTodos[i].title,
      testTitles[i],
    );
    TestValidator.equals(
      `todo ${i + 1} should belong to the authenticated user`,
      createdTodos[i].user.id,
      authorizedUser.id,
    );
    TestValidator.predicate(
      `todo ${i + 1} should have valid creation timestamp`,
      () => createdTodos[i].created_at.length > 0,
    );
    TestValidator.predicate(
      `todo ${i + 1} should have initial completion status as false`,
      () => createdTodos[i].completion_status === false,
    );
  }
  // 5. Verify all todos have unique IDs
  const todoIds = createdTodos.map((todo) => todo.id);
  const uniqueIds = new Set(todoIds);
  TestValidator.equals(
    "all todo IDs should be unique",
    uniqueIds.size,
    todoIds.length,
  );
}
