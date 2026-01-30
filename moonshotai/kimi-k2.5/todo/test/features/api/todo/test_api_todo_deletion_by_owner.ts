import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
/**
 * Test successful deletion of a todo item by its owner member.
 *
 * This test validates the complete flow of todo deletion:
 *
 * 1. A member joins the system and authenticates
 * 2. The member creates a new todo item
 * 3. The member deletes the todo item
 * 4. The deleted todo data is returned in the response for client confirmation
 *
 * The test verifies that the deletion endpoint returns the complete todo entity
 * that was removed, allowing clients to confirm what was deleted.
 */
export async function test_api_todo_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      nickname: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://example.com/todo/register",
      referrer: "https://example.com",
    } satisfies ITodoAppMember.IJoin,
  });
  // Step 2: Create a todo item that will be deleted
  const todoInput = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    priority: RandomGenerator.pick(["low", "medium", "high"] as const),
    due_date: new Date(Date.now() + 86400000).toISOString(),
  } satisfies ITodoAppTodo.ICreate;
  const createdTodo: ITodoAppTodo =
    await api.functional.todoApp.member.todos.create(memberConnection, {
      body: todoInput,
    });
  typia.assert(createdTodo);
  // Step 3: Delete the todo item and verify the response
  const deletedTodo: ITodoAppTodo =
    await api.functional.todoApp.member.todos.erase(memberConnection, {
      todoId: createdTodo.id,
    });
  typia.assert(deletedTodo);
  // Step 4: Validate that the deleted todo data matches the created todo
  TestValidator.equals(
    "deleted todo id matches created todo",
    deletedTodo.id,
    createdTodo.id,
  );
}
