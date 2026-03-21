import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
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

export async function test_api_todo_soft_delete_by_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member A and create a todo
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {});
  const memberA: api.IConnection = { host: connection.host };
  memberA.headers = {
    Authorization: `Bearer ${memberAAuthorized.token.access}`,
  };
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberA,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(todo);
  // Step 2: Authenticate as member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {});
  const memberB: api.IConnection = { host: connection.host };
  memberB.headers = {
    Authorization: `Bearer ${memberBAuthorized.token.access}`,
  };
  // Step 3: Attempt to delete member A's todo using member B's session
  // Should return 404 Not Found (not revealing that the todo exists)
  await TestValidator.httpError(
    "cannot soft delete another member's todo",
    404,
    async () => {
      await api.functional.multiUserTodo.member.todos.erase(memberB, {
        todoId: todo.id,
      });
    },
  );
}
