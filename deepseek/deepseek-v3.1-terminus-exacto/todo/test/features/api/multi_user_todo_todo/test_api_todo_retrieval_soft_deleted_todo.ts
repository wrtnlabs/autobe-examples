import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
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

export async function test_api_todo_retrieval_soft_deleted_todo(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {});
  typia.assert(auth);
  // 2. Create a todo
  const createdTodo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {},
  );
  typia.assert(createdTodo);
  // 3. Soft delete the todo
  await api.functional.multiUserTodo.member.todos.erase(memberConnection, {
    todoId: createdTodo.id,
  });
  // 4. Retrieve the soft-deleted todo
  const retrievedTodo = await api.functional.multiUserTodo.member.todos.at(
    memberConnection,
    {
      todoId: createdTodo.id,
    },
  );
  typia.assert(retrievedTodo);
  // 5. Validate the response includes deleted_at timestamp
  TestValidator.notEquals(
    "soft-deleted todo should have deleted_at timestamp",
    retrievedTodo.deleted_at,
    null,
  );
  TestValidator.equals(
    "todo ID should remain unchanged",
    retrievedTodo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "todo title should remain unchanged",
    retrievedTodo.title,
    createdTodo.title,
  );
  TestValidator.equals(
    "member ID should remain unchanged",
    retrievedTodo.member.id,
    createdTodo.member.id,
  );
  TestValidator.equals(
    "completion status should remain unchanged",
    retrievedTodo.is_completed,
    createdTodo.is_completed,
  );
}
