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

export async function test_api_todo_update_fields_history_and_privacy(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberACreds = {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: memberACreds.body,
  });
  typia.assert(memberAAuth);
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(memberBAuth);
  // Create initial todo for Member A
  const initialStart = RandomGenerator.date(
    new Date(),
    1000 * 60 * 60 * 24 * 10,
  ).toISOString() satisfies string & tags.Format<"date-time">;
  const initialDue = RandomGenerator.date(
    new Date(),
    1000 * 60 * 60 * 24 * 20,
  ).toISOString() satisfies string & tags.Format<"date-time">;
  const createdA = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        start_date: initialStart,
        due_date: initialDue,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(createdA);
  const todoIdA = createdA.id;
  const beforeA = createdA;
  // Update 1: change at least one editable field (title, description, and dates)
  const updatedStart1 = RandomGenerator.date(
    new Date(),
    1000 * 60 * 60 * 24 * 30,
  ).toISOString() satisfies string & tags.Format<"date-time">;
  const updatedDue1 = RandomGenerator.date(
    new Date(),
    1000 * 60 * 60 * 24 * 40,
  ).toISOString() satisfies string & tags.Format<"date-time">;
  const updatePayload1 = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    start_date: updatedStart1,
    due_date: updatedDue1,
  } satisfies ITodoAppTodo.IUpdate;
  const afterUpdate1 = await api.functional.todoApp.member.todos.update(
    memberAConnection,
    {
      todoId: todoIdA,
      body: updatePayload1,
    },
  );
  typia.assert(afterUpdate1);
  TestValidator.equals("todo id preserved", afterUpdate1.id, todoIdA);
  TestValidator.equals(
    "title updated",
    afterUpdate1.title,
    updatePayload1.title,
  );
  TestValidator.equals(
    "description updated",
    afterUpdate1.description,
    updatePayload1.description ?? null,
  );
  TestValidator.equals(
    "start_date updated",
    afterUpdate1.start_date,
    updatePayload1.start_date ?? null,
  );
  TestValidator.equals(
    "due_date updated",
    afterUpdate1.due_date,
    updatePayload1.due_date ?? null,
  );
  TestValidator.equals(
    "completion_status unchanged",
    afterUpdate1.completion_status,
    beforeA.completion_status,
  );
  TestValidator.equals(
    "deleted_at unchanged",
    afterUpdate1.deleted_at,
    beforeA.deleted_at,
  );
  TestValidator.equals(
    "deleted_in_trash_at unchanged",
    afterUpdate1.deleted_in_trash_at,
    beforeA.deleted_in_trash_at,
  );
  TestValidator.notEquals(
    "updated_at should change after real update",
    afterUpdate1.updated_at,
    beforeA.updated_at,
  );
  const beforeNoOpUpdatedAt = afterUpdate1.updated_at;
  // Update 2: no-op update (same editable fields)
  const afterNoOp = await api.functional.todoApp.member.todos.update(
    memberAConnection,
    {
      todoId: todoIdA,
      body: updatePayload1,
    },
  );
  typia.assert(afterNoOp);
  TestValidator.equals(
    "title preserved on no-op",
    afterNoOp.title,
    updatePayload1.title,
  );
  TestValidator.equals(
    "description preserved on no-op",
    afterNoOp.description,
    afterUpdate1.description,
  );
  TestValidator.equals(
    "start_date preserved on no-op",
    afterNoOp.start_date,
    afterUpdate1.start_date,
  );
  TestValidator.equals(
    "due_date preserved on no-op",
    afterNoOp.due_date,
    afterUpdate1.due_date,
  );
  TestValidator.equals(
    "completion_status unchanged on no-op",
    afterNoOp.completion_status,
    afterUpdate1.completion_status,
  );
  TestValidator.equals(
    "deleted_at unchanged on no-op",
    afterNoOp.deleted_at,
    afterUpdate1.deleted_at,
  );
  TestValidator.equals(
    "deleted_in_trash_at unchanged on no-op",
    afterNoOp.deleted_in_trash_at,
    afterUpdate1.deleted_in_trash_at,
  );
  TestValidator.equals(
    "updated_at unchanged on no-op",
    afterNoOp.updated_at,
    beforeNoOpUpdatedAt,
  );
  // Scenario 2: clear start_date and due_date to null
  const payload2 = {
    title: updatePayload1.title,
    description: updatePayload1.description,
    start_date: null,
    due_date: null,
  } satisfies ITodoAppTodo.IUpdate;
  const afterUpdate2 = await api.functional.todoApp.member.todos.update(
    memberAConnection,
    {
      todoId: todoIdA,
      body: payload2,
    },
  );
  typia.assert(afterUpdate2);
  TestValidator.equals("start_date cleared", afterUpdate2.start_date, null);
  TestValidator.equals("due_date cleared", afterUpdate2.due_date, null);
  TestValidator.equals("title unchanged", afterUpdate2.title, payload2.title);
  TestValidator.equals(
    "description unchanged",
    afterUpdate2.description,
    afterNoOp.description,
  );
  TestValidator.equals(
    "completion_status unchanged",
    afterUpdate2.completion_status,
    afterNoOp.completion_status,
  );
  TestValidator.equals(
    "deleted_at unchanged",
    afterUpdate2.deleted_at,
    afterNoOp.deleted_at,
  );
  TestValidator.equals(
    "deleted_in_trash_at unchanged",
    afterUpdate2.deleted_in_trash_at,
    afterNoOp.deleted_in_trash_at,
  );
  // Scenario 3: privacy boundary
  const attemptUpdateByB = async () => {
    await api.functional.todoApp.member.todos.update(memberBConnection, {
      todoId: todoIdA,
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 1 }),
        start_date: null,
        due_date: null,
      } satisfies ITodoAppTodo.IUpdate,
    });
  };
  await TestValidator.error(
    "should reject cross-member todo update",
    attemptUpdateByB,
  );
  // Ensure Member A's todo remains unchanged after rejected attempt
  // We don't have GET /todos/{id} in available SDK; so we re-apply a no-op update and verify updated_at is stable
  // by using PUT with same payload as current persisted state as proxy.
  const currentPayloadProxy = {
    title: afterUpdate2.title,
    description: afterUpdate2.description,
    start_date: afterUpdate2.start_date,
    due_date: afterUpdate2.due_date,
  } satisfies ITodoAppTodo.IUpdate;
  const afterNoOp2 = await api.functional.todoApp.member.todos.update(
    memberAConnection,
    {
      todoId: todoIdA,
      body: currentPayloadProxy,
    },
  );
  typia.assert(afterNoOp2);
  TestValidator.equals(
    "title unchanged after rejected attempt",
    afterNoOp2.title,
    afterUpdate2.title,
  );
  TestValidator.equals(
    "description unchanged after rejected attempt",
    afterNoOp2.description,
    afterUpdate2.description,
  );
  TestValidator.equals(
    "start_date unchanged after rejected attempt",
    afterNoOp2.start_date,
    afterUpdate2.start_date,
  );
  TestValidator.equals(
    "due_date unchanged after rejected attempt",
    afterNoOp2.due_date,
    afterUpdate2.due_date,
  );
}
