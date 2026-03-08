import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

export async function test_api_todo_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 2. Create initial todo
  const initialTodo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: "Initial Todo Title",
        description: "Initial description",
        start_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString(),
      },
    },
  );
  typia.assert(initialTodo);
  // 3. Store initial values
  const initialTitle = initialTodo.title;
  const initialDescription = initialTodo.description;
  const initialStartDate = initialTodo.start_date;
  const initialDueDate = initialTodo.due_date;
  const initialIsComplete = initialTodo.is_complete;
  const initialUpdatedAt = initialTodo.updated_at;
  // 4. Update todo with partial data
  const newTitle = "Updated Todo Title";
  const newDescription = "Updated description";
  const updatedTodo = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: initialTodo.id,
      body: {
        title: newTitle,
        description: newDescription,
      },
    },
  );
  typia.assert(updatedTodo);
  // 5. Verify update response - updated fields
  TestValidator.equals(
    "updated title matches request",
    updatedTodo.title,
    newTitle,
  );
  TestValidator.equals(
    "updated description matches request",
    updatedTodo.description,
    newDescription,
  );
  // 6. Verify update response - untouched fields preserved
  TestValidator.equals(
    "start_date preserved unchanged",
    updatedTodo.start_date,
    initialStartDate,
  );
  TestValidator.equals(
    "due_date preserved unchanged",
    updatedTodo.due_date,
    initialDueDate,
  );
  TestValidator.equals(
    "is_complete unchanged",
    updatedTodo.is_complete,
    initialIsComplete,
  );
  // 7. Verify updatedAt timestamp was refreshed
  TestValidator.notEquals(
    "updatedAt timestamp refreshed",
    initialUpdatedAt,
    updatedTodo.updated_at,
  );
  // 8. Verify is_deleted is still false
  TestValidator.equals(
    "is_deleted remains false",
    updatedTodo.is_deleted,
    false,
  );
  // 9. Verify author reference unchanged
  TestValidator.equals("author id unchanged", updatedTodo.author.id, member.id);
  TestValidator.equals(
    "author name unchanged",
    updatedTodo.author.displayName,
    member.display_name,
  );
}