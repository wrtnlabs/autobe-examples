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

export async function test_api_todo_update_history_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create member-specific connection with token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuth.token.access },
  };
  // 3. Create initial todo with all fields
  const initialTodo = await api.functional.todoApp.member.todos.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        startDate: new Date(Date.now() + 86400000).toISOString(), // tomorrow
        dueDate: new Date(Date.now() + 604800000).toISOString(), // next week
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(initialTodo);
  const originalUpdatedAt = initialTodo.updated_at;
  TestValidator.predicate("initial todo created", initialTodo.id !== undefined);
  TestValidator.predicate("title set", initialTodo.title.length > 0);
  TestValidator.predicate(
    "completed defaults to false",
    initialTodo.completed === false,
  );
  // 4. First update: change only title
  const updatedTitle = RandomGenerator.paragraph({ sentences: 2 });
  const update1 = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: initialTodo.id,
      body: {
        title: updatedTitle,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(update1);
  TestValidator.equals("title updated", update1.title, updatedTitle);
  TestValidator.notEquals(
    "updated_at changed after first update",
    update1.updated_at,
    originalUpdatedAt,
  );
  TestValidator.equals(
    "description unchanged",
    update1.description,
    initialTodo.description,
  );
  TestValidator.equals(
    "startDate unchanged",
    update1.start_date,
    initialTodo.start_date,
  );
  TestValidator.equals(
    "dueDate unchanged",
    update1.due_date,
    initialTodo.due_date,
  );
  TestValidator.equals(
    "completed unchanged",
    update1.completed,
    initialTodo.completed,
  );
  const afterUpdate1Timestamp = update1.updated_at;
  // 5. Second update: change description and completed status
  const updatedDescription = RandomGenerator.paragraph({ sentences: 8 });
  const update2 = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: initialTodo.id,
      body: {
        description: updatedDescription,
        completed: true,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(update2);
  TestValidator.equals(
    "description updated",
    update2.description,
    updatedDescription,
  );
  TestValidator.predicate("completed set to true", update2.completed === true);
  TestValidator.equals("title unchanged", update2.title, update1.title);
  TestValidator.notEquals(
    "updated_at changed after second update",
    update2.updated_at,
    afterUpdate1Timestamp,
  );
  const afterUpdate2Timestamp = update2.updated_at;
  // 6. Third update: change start_date and due_date
  const newStartDate = new Date(Date.now() + 172800000).toISOString(); // 2 days from now
  const newDueDate = new Date(Date.now() + 1209600000).toISOString(); // 2 weeks from now
  const update3 = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: initialTodo.id,
      body: {
        startDate: newStartDate,
        dueDate: newDueDate,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(update3);
  TestValidator.equals("startDate updated", update3.start_date, newStartDate);
  TestValidator.equals("dueDate updated", update3.due_date, newDueDate);
  TestValidator.equals("title unchanged", update3.title, update2.title);
  TestValidator.equals(
    "description unchanged",
    update3.description,
    update2.description,
  );
  TestValidator.equals(
    "completed unchanged",
    update3.completed,
    update2.completed,
  );
  TestValidator.notEquals(
    "updated_at changed after third update",
    update3.updated_at,
    afterUpdate2Timestamp,
  );
  // 7. Verify final state
  TestValidator.equals(
    "final title matches update1",
    update3.title,
    updatedTitle,
  );
  TestValidator.equals(
    "final description matches update2",
    update3.description,
    updatedDescription,
  );
  TestValidator.equals(
    "final completed matches update2",
    update3.completed,
    true,
  );
  TestValidator.predicate(
    "final startDate is valid date",
    update3.start_date !== null,
  );
  TestValidator.predicate(
    "final dueDate is valid date",
    update3.due_date !== null,
  );
}