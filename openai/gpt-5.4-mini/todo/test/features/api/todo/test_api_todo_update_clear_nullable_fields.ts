import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
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

export async function test_api_todo_update_clear_nullable_fields(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test updating a todo while clearing a nullable field and preserving omitted fields.
   *
   * Verifies that a member can partially update one of their own todos by setting
   * the description to null while changing the due date, and that unrelated fields
   * such as title, start date, completion status, ownership, and deletedAt remain
   * consistent in the response.
   *
   * 1. Register a new member and prepare an isolated authenticated connection.
   * 2. Create an owned todo with a non-null description and a due date.
   * 3. Update the todo with description cleared to null and a new due date.
   * 4. Validate the updated todo reflects the partial update semantics.
   */
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  const originalDescription = RandomGenerator.paragraph({ sentences: 2 });
  const originalDueDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24,
  ).toISOString();
  const originalStartDate = new Date(
    Date.now() - 1000 * 60 * 60 * 24,
  ).toISOString();
  const created = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: originalDescription,
        startDate: originalStartDate,
        dueDate: originalDueDate,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(created);
  const updatedDueDate = new Date(
    Date.now() + 1000 * 60 * 60 * 48,
  ).toISOString();
  const updated = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: created.id,
      body: {
        description: null,
        dueDate: updatedDueDate,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals(
    "todo id should remain the same",
    updated.id,
    created.id,
  );
  TestValidator.equals(
    "todo title should remain unchanged",
    updated.title,
    created.title,
  );
  TestValidator.equals(
    "todo description should be cleared",
    updated.description,
    null,
  );
  TestValidator.equals(
    "todo start date should remain unchanged",
    updated.startDate,
    created.startDate,
  );
  TestValidator.equals(
    "todo due date should be updated",
    updated.dueDate,
    updatedDueDate,
  );
  TestValidator.equals(
    "todo completion state should remain unchanged",
    updated.isCompleted,
    created.isCompleted,
  );
  TestValidator.equals(
    "todo owner should remain unchanged",
    updated.member,
    created.member,
  );
  TestValidator.equals(
    "todo deletedAt should remain unchanged",
    updated.deletedAt,
    created.deletedAt,
  );
}
