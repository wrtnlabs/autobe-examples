import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

export async function test_api_trash_list_filter_by_completion_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member account
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(auth);
  // 2. Create multiple todos for testing
  const todo1 = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(todo1);
  const todo2 = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(todo2);
  const todo3 = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(todo3);
  // 3. Soft delete all todos to populate trash
  await api.functional.multiUserTodo.member.todos.erase(memberConnection, {
    todoId: todo1.id,
  });
  await api.functional.multiUserTodo.member.todos.erase(memberConnection, {
    todoId: todo2.id,
  });
  await api.functional.multiUserTodo.member.todos.erase(memberConnection, {
    todoId: todo3.id,
  });
  // 4. Test trash list with status 'complete' filter
  const completeTrash =
    await api.functional.multiUserTodo.member.todos.trash.index(
      memberConnection,
      {
        body: {
          status: "complete",
        } satisfies IMultiUserTodoTodo.IRequest,
      },
    );
  typia.assert(completeTrash);
  // 5. Test trash list with status 'incomplete' filter
  const incompleteTrash =
    await api.functional.multiUserTodo.member.todos.trash.index(
      memberConnection,
      {
        body: {
          status: "incomplete",
        } satisfies IMultiUserTodoTodo.IRequest,
      },
    );
  typia.assert(incompleteTrash);
  // 6. Test trash list with status 'all' filter
  const allTrash = await api.functional.multiUserTodo.member.todos.trash.index(
    memberConnection,
    {
      body: {
        status: "all",
      } satisfies IMultiUserTodoTodo.IRequest,
    },
  );
  typia.assert(allTrash);
  // 7. Validate filtering results
  // All todos are incomplete (no completion endpoint available in provided APIs)
  TestValidator.equals(
    "complete trash should be empty",
    completeTrash.data.length,
    0,
  );
  TestValidator.equals(
    "incomplete trash should contain all deleted todos",
    incompleteTrash.data.length,
    3,
  );
  TestValidator.equals(
    "all trash should contain all deleted todos",
    allTrash.data.length,
    3,
  );
  TestValidator.equals(
    "all equals complete plus incomplete",
    allTrash.data.length,
    completeTrash.data.length + incompleteTrash.data.length,
  );
  // 8. Verify all items in trash have deletedAt set
  for (const item of allTrash.data) {
    TestValidator.predicate(
      `todo ${item.id} should be in trash`,
      item.deletedAt !== null,
    );
  }
  // 9. Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    allTrash.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records match data length",
    allTrash.pagination.records === allTrash.data.length,
  );
}
