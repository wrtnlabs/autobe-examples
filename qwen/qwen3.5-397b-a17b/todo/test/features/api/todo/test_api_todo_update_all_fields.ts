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

/**
 * Test updating a todo with all fields.
 * 1. Register new member account
 * 2. Create todo with title only
 * 3. Update todo with all fields (title, description, startedAt, dueAt)
 * 4. Verify updated values and timestamps
 */
export async function test_api_todo_update_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
  const auth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(auth);
  // 2. Create member-specific connection
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${auth.token.access}` },
  };
  // 3. Create todo with title only
  const createdTodo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(createdTodo);
  // 4. Update todo with all fields
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    startedAt: new Date().toISOString(),
    dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  } satisfies IMultiUserTodoTodo.IUpdate;
  const updatedTodo = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId: createdTodo.id,
      body: updateBody,
    },
  );
  typia.assert(updatedTodo);
  // 5. Verify updated values
  TestValidator.equals("title updated", updatedTodo.title, updateBody.title);
  TestValidator.equals(
    "description updated",
    updatedTodo.description,
    updateBody.description,
  );
  TestValidator.equals(
    "startedAt updated",
    updatedTodo.started_at,
    updateBody.startedAt,
  );
  TestValidator.equals("dueAt updated", updatedTodo.due_at, updateBody.dueAt);
  // 6. Verify timestamps
  TestValidator.predicate(
    "updated_at is newer",
    new Date(updatedTodo.updated_at) > new Date(createdTodo.created_at),
  );
  TestValidator.predicate(
    "updated_at changed",
    new Date(updatedTodo.updated_at) > new Date(createdTodo.updated_at),
  );
  // 7. Verify member ownership preserved
  TestValidator.equals(
    "member id preserved",
    updatedTodo.member.id,
    createdTodo.member.id,
  );
  TestValidator.equals(
    "member displayName preserved",
    updatedTodo.member.displayName,
    createdTodo.member.displayName,
  );
  // 8. Verify edit history was created
  TestValidator.predicate(
    "has edit history",
    updatedTodo.editHistories.length > 0,
  );
  const latestHistory = updatedTodo.editHistories[0];
  TestValidator.equals(
    "history title matches",
    latestHistory.title,
    updateBody.title,
  );
  TestValidator.equals(
    "history description matches",
    latestHistory.description,
    updateBody.description,
  );
}
