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

export async function test_api_todo_creation_success_minimal_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member user
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IMultiUserTodoMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        href: "http://test.example.com/join",
        referrer: "http://test.example.com",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(member);
  // 2. Create todo with only required title field
  const inputTitle = RandomGenerator.paragraph({ sentences: 1 });
  const todo: IMultiUserTodoTodo =
    await api.functional.multiUserTodo.member.todos.create(memberConnection, {
      body: {
        title: inputTitle,
      } satisfies IMultiUserTodoTodo.ICreate,
    });
  typia.assert(todo);
  // 3. Validate response has correct null defaults
  TestValidator.equals(
    "description is null when not provided",
    todo.description,
    null,
  );
  TestValidator.equals(
    "start_date is null when not provided",
    todo.start_date,
    null,
  );
  TestValidator.equals(
    "due_date is null when not provided",
    todo.due_date,
    null,
  );
  // 4. Validate default boolean flags
  TestValidator.equals(
    "is_complete defaults to false",
    todo.is_complete,
    false,
  );
  TestValidator.equals("is_deleted defaults to false", todo.is_deleted, false);
  // 5. Validate ownership and timestamps
  TestValidator.equals(
    "member_id matches authenticated user",
    todo.multi_user_todo_member_id,
    member.id,
  );
  TestValidator.equals("title matches input", todo.title, inputTitle);
  TestValidator.equals(
    "deleted_at is null for active todo",
    todo.deleted_at,
    null,
  );
  // 6. Validate UUID format for id field
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  TestValidator.predicate("id is valid UUID format", uuidPattern.test(todo.id));
  // 7. Validate timestamp formats
  TestValidator.predicate(
    "created_at is valid date-time format",
    !isNaN(new Date(todo.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date-time format",
    !isNaN(new Date(todo.updated_at).getTime()),
  );
  // 8. Verify created_at equals updated_at (no modifications yet)
  TestValidator.equals(
    "created_at equals updated_at on creation",
    todo.created_at,
    todo.updated_at,
  );
}
