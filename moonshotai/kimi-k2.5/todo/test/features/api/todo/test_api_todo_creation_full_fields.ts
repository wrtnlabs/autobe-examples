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
 * Create a new todo task with all optional fields populated including title, description, startDate, and dueDate.
 * This tests the comprehensive todo creation workflow where a member provides complete task information.
 * Verify the response returns a complete todo entity with all fields correctly populated.
 */
export async function test_api_todo_creation_full_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member to obtain authorized access
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string & tags.MinLength<1> & tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16) satisfies string as string & tags.MinLength<8> & tags.Format<"password">,
      href: typia.random<string & tags.Format<"url">>() satisfies string as string & tags.Format<"url">,
      referrer: typia.random<string & tags.Format<"url">>() satisfies string as string & tags.Format<"url">,
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Prepare todo creation data with all optional fields
  const startDate = new Date().toISOString();
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const todoBody = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    startDate: startDate,
    dueDate: dueDate,
  } satisfies IMultiUserTodoTodo.ICreate;
  // 3. Create the todo
  const todo = await api.functional.multiUserTodo.member.todos.create(
    memberConnection,
    { body: todoBody },
  );
  typia.assert(todo);
  // 4. Verify all fields
  TestValidator.equals("title matches", todo.title, todoBody.title);
  TestValidator.equals(
    "description matches",
    todo.description,
    todoBody.description,
  );
  TestValidator.equals("startDate matches", todo.startDate, todoBody.startDate);
  TestValidator.equals("dueDate matches", todo.dueDate, todoBody.dueDate);
  TestValidator.predicate("isComplete is false", todo.isComplete === false);
  TestValidator.predicate("completedAt is null", todo.completedAt === null);
  TestValidator.predicate("deletedAt is null", todo.deletedAt === null);
  TestValidator.predicate("createdAt is defined", todo.createdAt !== null);
  TestValidator.predicate("updatedAt is defined", todo.updatedAt !== null);
}