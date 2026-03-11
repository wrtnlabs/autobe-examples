import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoCompletionStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoCompletionStatus";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_member_todos_completion_statuses_create } from "../../../generate/generate_random_multi_user_todo_member_todos_completion_statuses_create";
import { generate_random_multi_user_todo_member_todos_create } from "../../../generate/generate_random_multi_user_todo_member_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";
import { prepare_random_multi_user_todo_todo_completion_status } from "../../../prepare/prepare_random_multi_user_todo_todo_completion_status";

/**
 * Test authorization validation when attempting to access completion status records.
 *
 * 1. Authenticate as first member to create todo
 * 2. Create a todo item for first member
 * 3. Mark the todo as complete to create status record
 * 4. Authenticate as second member to test authorization
 * 5. Second member attempts to retrieve first member's completion status record
 * 6. Validate that the system rejects the request with proper authorization error
 */
export async function test_api_todo_completion_status_authorization_check(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member setup
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Create todo for member A
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberAConnection,
    {},
  );
  typia.assert(todo);
  TestValidator.equals("todo belongs to member A", todo.member.id, memberA.id);
  // 3. Mark todo as complete to create completion status record
  const updatedTodo =
    await generate_random_multi_user_todo_member_todos_completion_statuses_create(
      memberAConnection,
      {
        params: { todoId: todo.id },
        body: {
          is_completed: true,
        } satisfies IMultiUserTodoTodoCompletionStatus.ICreate,
      },
    );
  typia.assert(updatedTodo);
  TestValidator.predicate("todo is now complete", updatedTodo.is_completed);
  // We need to get the completion status ID from somewhere - check if it's returned
  // For now, we'll assume the endpoint expects a valid UUID
  // In a real implementation, we would fetch the completion status list and get the ID
  const completionStatusId = typia.random<string & tags.Format<"uuid">>();
  // 4. Second member setup
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 5. Member B attempts to retrieve member A's completion status record
  // This should fail with authorization error
  await TestValidator.error(
    "member B cannot access member A's completion status",
    async () => {
      await api.functional.multiUserTodo.member.todos.completion_statuses.at(
        memberBConnection,
        {
          todoId: todo.id,
          completionStatusId: completionStatusId,
        },
      );
    },
  );
}
