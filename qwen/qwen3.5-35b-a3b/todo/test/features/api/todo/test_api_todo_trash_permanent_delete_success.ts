import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import type { IMultiUserTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppTodo";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_app_member_todos_create } from "../../../generate/generate_random_multi_user_todo_app_member_todos_create";
import { prepare_random_multi_user_todo_app_todo } from "../../../prepare/prepare_random_multi_user_todo_app_todo";

export async function test_api_todo_trash_permanent_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Member creates a todo
  const todo = await generate_random_multi_user_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IMultiUserTodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Member soft deletes the todo (moves to trash)
  await api.functional.multiUserTodoApp.member.todos.erase(memberConnection, {
    todoId: todo.id,
  });
  // 4. Verify todo appears in trash list
  const trashList =
    await api.functional.multiUserTodoApp.member.todos.trash.index(
      memberConnection,
      {
        body: {} satisfies IMultiUserTodoAppTodo.IRequest,
      },
    );
  typia.assert(trashList);
  const todoInTrash = trashList.data.find((item) => item.id === todo.id);
  TestValidator.predicate("todo should be in trash", todoInTrash !== undefined);
  // 5. Member permanently deletes the todo from trash
  await api.functional.multiUserTodoApp.member.todos.trash.erase(
    memberConnection,
    {
      todoId: todo.id,
    },
  );
  // 6. Verify todo no longer appears in trash list
  const trashListAfter =
    await api.functional.multiUserTodoApp.member.todos.trash.index(
      memberConnection,
      {
        body: {} satisfies IMultiUserTodoAppTodo.IRequest,
      },
    );
  typia.assert(trashListAfter);
  const todoInTrashAfter = trashListAfter.data.find(
    (item: IMultiUserTodoAppTodo.ISummary) => item.id === todo.id,
  );
  TestValidator.predicate(
    "todo should be removed from trash",
    todoInTrashAfter === undefined,
  );
}
