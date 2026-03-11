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

export async function test_api_todo_update_clear_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup & Authentication - Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: undefined,
  });
  typia.assert(auth);
  // 2. Initial Todo Creation - Create todo with all optional fields populated
  const initialTodo = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 7,
        }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 2,
          sentenceMax: 4,
        }),
        startDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        dueDate: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
      } satisfies DeepPartial<IMultiUserTodoTodo.ICreate>,
    },
  );
  typia.assert(initialTodo);
  // Validate initial todo has all optional fields populated
  TestValidator.notEquals(
    "description not null initially",
    initialTodo.description,
    null,
  );
  TestValidator.notEquals(
    "start_date not null initially",
    initialTodo.start_date,
    null,
  );
  TestValidator.notEquals(
    "due_date not null initially",
    initialTodo.due_date,
    null,
  );
  // 3. Update Operation - Clear optional fields by setting them to null
  const updatedTodo = await api.functional.multiUserTodo.member.todos.update(
    memberConnection,
    {
      todoId: initialTodo.id,
      body: {
        title: initialTodo.title, // Preserve same title
        description: null,
        start_date: null,
        due_date: null,
      } satisfies IMultiUserTodoTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // 4. Validation
  // 4.1. Title remains unchanged
  TestValidator.equals(
    "title unchanged after update",
    updatedTodo.title,
    initialTodo.title,
  );
  // 4.2. Optional fields are cleared (null)
  TestValidator.equals(
    "description cleared to null",
    updatedTodo.description,
    null,
  );
  TestValidator.equals(
    "start_date cleared to null",
    updatedTodo.start_date,
    null,
  );
  TestValidator.equals("due_date cleared to null", updatedTodo.due_date, null);
  // 4.3. Completion status unchanged (should remain false for new todo)
  TestValidator.equals(
    "completion status unchanged",
    updatedTodo.is_completed,
    initialTodo.is_completed,
  );
  TestValidator.equals(
    "completion status is false",
    updatedTodo.is_completed,
    false,
  );
  // 4.4. Ownership preserved
  TestValidator.equals(
    "member id unchanged",
    updatedTodo.member.id,
    initialTodo.member.id,
  );
  // 4.5. System-generated fields
  TestValidator.equals("id unchanged", updatedTodo.id, initialTodo.id);
  TestValidator.predicate(
    "updated_at later than created_at",
    new Date(updatedTodo.updated_at) > new Date(initialTodo.created_at),
  );
}
