import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIPrivateTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPrivateTodoAppTodo";
import type { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import type { IPrivateTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_private_todo_app_member_todos_create } from "../../../generate/generate_random_private_todo_app_member_todos_create";
import { prepare_random_private_todo_app_todo } from "../../../prepare/prepare_random_private_todo_app_todo";

export async function test_api_trash_list_with_deleted_todos(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create multiple todos (at least 3) with varying completion status
  const todo1 = await generate_random_private_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(todo1);
  const todo2 = await generate_random_private_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(todo2);
  const todo3 = await generate_random_private_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(todo3);
  // 3. Delete all todos to move them to trash
  await api.functional.privateTodoApp.member.todos.erase(memberConnection, {
    todoId: todo1.id,
  });
  await api.functional.privateTodoApp.member.todos.erase(memberConnection, {
    todoId: todo2.id,
  });
  await api.functional.privateTodoApp.member.todos.erase(memberConnection, {
    todoId: todo3.id,
  });
  // 4. Call trash endpoint with default parameters
  const trashList = await api.functional.privateTodoApp.member.trash.index(
    memberConnection,
    {
      body: {} satisfies IPrivateTodoAppTodo.IRequest,
    },
  );
  typia.assert(trashList);
  // 5. Verify business logic - at least 3 todos in trash
  TestValidator.predicate(
    "at least 3 todos in trash",
    trashList.data.length >= 3,
  );
  // 6. Verify our deleted todos are in the list
  const trashIds = trashList.data.map((t) => t.id);
  TestValidator.predicate("todo1 in trash", trashIds.includes(todo1.id));
  TestValidator.predicate("todo2 in trash", trashIds.includes(todo2.id));
  TestValidator.predicate("todo3 in trash", trashIds.includes(todo3.id));
}
