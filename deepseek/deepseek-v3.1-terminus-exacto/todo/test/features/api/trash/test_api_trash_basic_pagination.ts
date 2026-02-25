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

export async function test_api_trash_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create user authentication context
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Create multiple todos to populate trash
  const todos = await ArrayUtil.asyncRepeat(3, async () => {
    const todo = await generate_random_todo_app_user_todos_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
    typia.assert(todo);
    return todo;
  });
  // Soft delete all todos to populate trash
  for (const todo of todos) {
    await api.functional.todoApp.user.todos.erase(userConnection, {
      todoId: todo.id,
    });
  }
  // Test trash pagination
  const trashResponse = await api.functional.todoApp.user.trash.index(
    userConnection,
    {
      body: {
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 20 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies ITodoAppTrashItem.IRequest,
    },
  );
  typia.assert(trashResponse);
  // Validate pagination metadata
  TestValidator.equals("current page", trashResponse.pagination.current, 1);
  TestValidator.equals("limit", trashResponse.pagination.limit, 20);
  TestValidator.predicate(
    "total records",
    trashResponse.pagination.records >= 0,
  );
  TestValidator.predicate("total pages", trashResponse.pagination.pages >= 0);
  TestValidator.predicate(
    "records calculation",
    trashResponse.pagination.pages ===
      Math.ceil(
        trashResponse.pagination.records / trashResponse.pagination.limit,
      ) || trashResponse.pagination.pages === 0,
  );
  // Validate trash items structure and user isolation
  for (const trashItem of trashResponse.data) {
    typia.assert<ITodoAppTrashItem.ISummary>(trashItem);
    // Verify deletion timestamp is present
    TestValidator.predicate(
      "has deletion timestamp",
      trashItem.deleted_at !== "",
    );
    // Verify restoration status is null (still in trash)
    TestValidator.equals("not restored", trashItem.restored_at, null);
    // Verify permanent deletion status is null
    TestValidator.equals(
      "not permanently deleted",
      trashItem.permanently_deleted_at,
      null,
    );
    // Validate todo summary structure
    typia.assert<ITodoAppTodo.ISummary>(trashItem.todo);
    // Verify todo has required fields
    TestValidator.predicate("todo has title", trashItem.todo.title.length > 0);
    TestValidator.predicate(
      "todo has deletion timestamp",
      trashItem.todo.deleted_at !== null,
    );
  }
  // Validate data array matches pagination records count
  TestValidator.equals(
    "data array matches pagination",
    trashResponse.data.length,
    Math.min(trashResponse.pagination.limit, trashResponse.pagination.records),
  );
}
