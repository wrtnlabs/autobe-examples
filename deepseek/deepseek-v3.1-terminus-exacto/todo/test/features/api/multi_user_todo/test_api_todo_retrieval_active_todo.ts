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

export async function test_api_todo_retrieval_active_todo(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a todo with comprehensive data
  const todoCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    startDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
  } satisfies IMultiUserTodoTodo.ICreate;
  const createdTodo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    { body: todoCreateBody },
  );
  typia.assert(createdTodo);
  // 3. Retrieve the todo by ID
  const retrievedTodo = await api.functional.multiUserTodo.member.todos.at(
    memberConnection,
    { todoId: createdTodo.id },
  );
  typia.assert(retrievedTodo);
  // 4. Validate all fields
  TestValidator.equals("todo ID matches", retrievedTodo.id, createdTodo.id);
  TestValidator.equals(
    "title matches",
    retrievedTodo.title,
    todoCreateBody.title,
  );
  TestValidator.equals(
    "description matches",
    retrievedTodo.description,
    todoCreateBody.description,
  );
  // Compare dates by parsing to Date objects to avoid precision issues
  if (retrievedTodo.start_date && todoCreateBody.startDate) {
    const retrievedStart = new Date(retrievedTodo.start_date);
    const createdStart = new Date(todoCreateBody.startDate);
    TestValidator.predicate(
      "start date is approximately correct",
      Math.abs(retrievedStart.getTime() - createdStart.getTime()) < 1000,
    ); // Within 1 second
  }
  if (retrievedTodo.due_date && todoCreateBody.dueDate) {
    const retrievedDue = new Date(retrievedTodo.due_date);
    const createdDue = new Date(todoCreateBody.dueDate);
    TestValidator.predicate(
      "due date is approximately correct",
      Math.abs(retrievedDue.getTime() - createdDue.getTime()) < 1000,
    ); // Within 1 second
  }
  TestValidator.equals(
    "completion status is false",
    retrievedTodo.is_completed,
    false,
  );
  TestValidator.equals(
    "deleted_at is null for active todo",
    retrievedTodo.deleted_at,
    null,
  );
  // Validate member information
  TestValidator.equals(
    "member ID matches creator",
    retrievedTodo.member.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "member email matches",
    retrievedTodo.member.email,
    memberAuth.email,
  );
  TestValidator.equals(
    "member display name matches",
    retrievedTodo.member.display_name,
    memberAuth.display_name,
  );
}
