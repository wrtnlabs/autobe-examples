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
 * Test multiple completion status changes on the same todo to ensure proper audit trail creation.
 * Authenticate as member, create a todo, then perform several completion status changes
 * (complete → incomplete → complete). Validate that each status change is properly recorded
 * and that the todo's final state reflects the last operation.
 */
export async function test_api_todo_completion_status_multiple_changes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a todo
  const todo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. First status change: mark as complete
  const firstStatusChange =
    await generate_random_multi_user_todo_member_todos_completion_statuses_create(
      memberConnection,
      {
        params: { todoId: todo.id },
        body: {
          is_completed: true,
        } satisfies IMultiUserTodoTodoCompletionStatus.ICreate,
      },
    );
  typia.assert(firstStatusChange);
  TestValidator.equals(
    "todo should be marked complete after first status change",
    firstStatusChange.is_completed,
    true,
  );
  TestValidator.notEquals(
    "updated_at timestamp should change after first status change",
    firstStatusChange.updated_at,
    todo.updated_at,
  );
  // 4. Second status change: mark as incomplete
  const secondStatusChange =
    await generate_random_multi_user_todo_member_todos_completion_statuses_create(
      memberConnection,
      {
        params: { todoId: todo.id },
        body: {
          is_completed: false,
        } satisfies IMultiUserTodoTodoCompletionStatus.ICreate,
      },
    );
  typia.assert(secondStatusChange);
  TestValidator.equals(
    "todo should be marked incomplete after second status change",
    secondStatusChange.is_completed,
    false,
  );
  TestValidator.notEquals(
    "updated_at timestamp should change after second status change",
    secondStatusChange.updated_at,
    firstStatusChange.updated_at,
  );
  // 5. Third status change: mark as complete again
  const thirdStatusChange =
    await generate_random_multi_user_todo_member_todos_completion_statuses_create(
      memberConnection,
      {
        params: { todoId: todo.id },
        body: {
          is_completed: true,
        } satisfies IMultiUserTodoTodoCompletionStatus.ICreate,
      },
    );
  typia.assert(thirdStatusChange);
  TestValidator.equals(
    "todo should be marked complete after third status change",
    thirdStatusChange.is_completed,
    true,
  );
  TestValidator.notEquals(
    "updated_at timestamp should change after third status change",
    thirdStatusChange.updated_at,
    secondStatusChange.updated_at,
  );
  // 6. Final validation
  TestValidator.equals(
    "todo ID should remain consistent throughout all operations",
    thirdStatusChange.id,
    todo.id,
  );
  TestValidator.predicate(
    "final status should reflect the last completion status change",
    thirdStatusChange.is_completed === true,
  );
  TestValidator.notEquals(
    "final updated_at should be different from original creation time",
    thirdStatusChange.updated_at,
    todo.updated_at,
  );
}
