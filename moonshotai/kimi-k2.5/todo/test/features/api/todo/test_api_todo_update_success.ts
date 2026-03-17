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

export async function test_api_todo_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create the todo that will be updated
  const now = new Date();
  const originalDueDate = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString(); // 1 day from now
  const createdTodo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        dueDate: originalDueDate,
      },
    },
  );
  typia.assert(createdTodo);
  // 3. Prepare update payload with new values
  const newDueDate = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 1 week from now
  const updateBody = {
    title: RandomGenerator.name(),
    due_date: newDueDate,
  } satisfies IMultiUserTodoTodo.IUpdate;
  // 4. Update the todo using SDK (no utility function available for PUT endpoint)
  const updatedTodo = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId: createdTodo.id,
      body: updateBody,
    },
  );
  typia.assert(updatedTodo);
  // 5. Validate response contains updated values
  TestValidator.equals("title updated", updatedTodo.title, updateBody.title);
  TestValidator.equals(
    "dueDate updated",
    updatedTodo.dueDate,
    updateBody.due_date,
  );
  // 6. Verify createdAt unchanged
  TestValidator.equals(
    "createdAt unchanged",
    updatedTodo.createdAt,
    createdTodo.createdAt,
  );
  // 7. Verify updatedAt refreshed (newer than original)
  const originalUpdatedAt = new Date(createdTodo.updatedAt).getTime();
  const newUpdatedAt = new Date(updatedTodo.updatedAt).getTime();
  TestValidator.predicate(
    "updatedAt refreshed",
    newUpdatedAt > originalUpdatedAt,
  );
}
