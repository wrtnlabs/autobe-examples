import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTrashItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTrashItem";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTrashItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashItem";
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

export async function test_api_trash_deletion_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Create multiple todos for testing
  const todos = await ArrayUtil.asyncRepeat(5, async (index) => {
    const todo = await generate_random_todo_app_user_todos_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ITodoAppTodo.ICreate,
      },
    );
    typia.assert(todo);
    return todo;
  });
  // Delete todos with simulated time differences
  const deletionTimes: string[] = [];
  // Delete first todo immediately
  await api.functional.todoApp.user.todos.erase(userConnection, {
    todoId: todos[0].id,
  });
  deletionTimes[0] = new Date().toISOString();
  // Wait a bit before deleting second todo
  await new Promise((resolve) => setTimeout(resolve, 100));
  await api.functional.todoApp.user.todos.erase(userConnection, {
    todoId: todos[1].id,
  });
  deletionTimes[1] = new Date().toISOString();
  // Wait a bit more before deleting third todo
  await new Promise((resolve) => setTimeout(resolve, 100));
  await api.functional.todoApp.user.todos.erase(userConnection, {
    todoId: todos[2].id,
  });
  deletionTimes[2] = new Date().toISOString();
  // Test 1: deleted_at_from only (items deleted after specific time)
  const middleTime = deletionTimes[1];
  const fromOnlyResult = await api.functional.todoApp.user.trash.index(
    userConnection,
    {
      body: {
        deleted_at_from: middleTime,
        deleted_at_to: null,
      } satisfies ITodoAppTrashItem.IRequest,
    },
  );
  typia.assert(fromOnlyResult);
  // Should include todos deleted after middleTime (todos[1] and todos[2])
  TestValidator.equals(
    "from only should include items deleted after specified time",
    fromOnlyResult.data.length >= 2,
    true,
  );
  // Test 2: deleted_at_to only (items deleted before specific time)
  const toOnlyResult = await api.functional.todoApp.user.trash.index(
    userConnection,
    {
      body: {
        deleted_at_from: null,
        deleted_at_to: middleTime,
      } satisfies ITodoAppTrashItem.IRequest,
    },
  );
  typia.assert(toOnlyResult);
  // Should include todos deleted before middleTime (todos[0] and todos[1])
  TestValidator.equals(
    "to only should include items deleted before specified time",
    toOnlyResult.data.length >= 2,
    true,
  );
  // Test 3: both parameters for bounded range
  const boundedResult = await api.functional.todoApp.user.trash.index(
    userConnection,
    {
      body: {
        deleted_at_from: deletionTimes[0],
        deleted_at_to: deletionTimes[2],
      } satisfies ITodoAppTrashItem.IRequest,
    },
  );
  typia.assert(boundedResult);
  // Should include todos deleted within the range (todos[0], todos[1], todos[2])
  TestValidator.equals(
    "bounded range should include all items within date range",
    boundedResult.data.length >= 3,
    true,
  );
  // Validate that retrieved items have proper deletion timestamps
  const allItems = await api.functional.todoApp.user.trash.index(
    userConnection,
    {
      body: {
        deleted_at_from: null,
        deleted_at_to: null,
      } satisfies ITodoAppTrashItem.IRequest,
    },
  );
  typia.assert(allItems);
  // Verify each item has valid structure (typia.assert validates everything)
  // No redundant checks needed after typia.assert()
}
