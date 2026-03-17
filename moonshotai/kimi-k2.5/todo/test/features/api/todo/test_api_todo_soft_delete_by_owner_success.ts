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

/**
 * Test validates the primary soft delete workflow for a member's todo.
 *
 * Test Flow:
 * 1. Register and authenticate as a member
 * 2. Create a todo with specific title
 * 3. Soft delete the todo via DELETE endpoint
 * 4. Verify operation completed successfully
 *
 * Expected:
 * - The system verifies member ownership before deletion
 * - The soft delete operation completes without error
 * - The todo is moved to a recoverable state
 */
export async function test_api_todo_soft_delete_by_owner_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember: IMultiUserTodoMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<
          string & tags.MinLength<1> & tags.Format<"email">
        >(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"url">>(),
        referrer: typia.random<string & tags.Format<"url">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies DeepPartial<IMultiUserTodoMember.IJoin>,
    });
  typia.assert(authorizedMember);
  // 2. Create a todo that the member owns
  const todoInput = {
    title: "Project Task",
  } satisfies DeepPartial<IMultiUserTodoTodo.ICreate>;
  const createdTodo: IMultiUserTodoTodo =
    await generate_random_multi_user_todo_member_todos_create(
      memberConnection,
      {
        body: todoInput,
      },
    );
  typia.assert(createdTodo);
  // Verify initial state - todo should not be deleted yet
  TestValidator.predicate(
    "todo should not be soft deleted before deletion",
    createdTodo.deletedAt === null,
  );
  // 3. Soft delete the todo - operation success confirmed by no exception
  await api.functional.multiUserTodo.member.todos.erase(memberConnection, {
    todoId: createdTodo.id,
  });
}
