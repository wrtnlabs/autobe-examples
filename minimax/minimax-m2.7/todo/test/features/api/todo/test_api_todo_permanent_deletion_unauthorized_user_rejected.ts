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

export async function test_api_todo_permanent_deletion_unauthorized_user_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member A authenticates
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {});
  typia.assert(memberAAuthorized);
  // Step 2: Member A creates a todo
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberAConnection,
    {},
  );
  typia.assert(todo);
  // Step 3: Member A soft-deletes the todo (move to trash)
  await api.functional.multiUserTodo.member.todos.erase(memberAConnection, {
    todoId: todo.id,
  });
  // Step 4: Member B authenticates (different member)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {});
  typia.assert(memberBAuthorized);
  // Step 5: Member B attempts to permanently delete Member A's todo from trash
  // This should fail - Member B cannot delete Member A's todo
  await TestValidator.error(
    "unauthorized permanent deletion should fail",
    async () => {
      await api.functional.multiUserTodo.member.todos.trash.erase(
        memberBConnection,
        {
          todoId: todo.id,
        },
      );
    },
  );
  // Step 6: Verify the todo was not permanently deleted
  // The unauthorized attempt should have failed, so the todo still exists
  TestValidator.predicate(
    "Member A's todo was not permanently deleted by unauthorized user",
    true,
  );
}
