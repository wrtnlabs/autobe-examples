import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoTodoEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistoryEntry";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
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

export async function test_api_todo_delete_takes_precedence_over_view_and_edit(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that deleting a todo takes precedence over concurrent view and edit.
   *
   * Validates that when a member deletes a todo while (near) simultaneously
   * requesting its detail view and attempting an update, the delete operation
   * prevails:
   *
   * 1. The DELETE operation completes successfully.
   * 2. After all concurrent operations settle, the todo becomes
   *    non-retrievable via the details endpoint (normal accessibility is lost).
   * 3. If view/edit calls returned a body (due to race timing), they must not
   *    represent a still-active, accessible todo once deletion has settled.
   */
  // 1. Authenticate a member (actor-specific connection)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      display_name: RandomGenerator.name(),
      password: typia.random<
        string & tags.MinLength<1> & tags.Format<"password">
      >(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoUserProfile.IJoin,
  });
  // 2. Create a todo
  const created = await generate_random_multi_user_todo_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        startDate: RandomGenerator.date(new Date(), 1000 * 60).toISOString(),
        dueDate: RandomGenerator.date(new Date(), 1000 * 60 * 60).toISOString(),
      } satisfies IMultiUserTodoTodo.ICreate,
    },
  );
  typia.assert(created);
  // 3. Near-simultaneous view + edit + delete
  const viewPromise = api.functional.multiUserTodo.member.todos.at(
    memberConnection,
    { todoId: created.id },
  );
  const editBody: IMultiUserTodoTodo.IUpdate = {
    title: `${created.title} (edited ${RandomGenerator.alphabets(3)})`,
    description: created.description,
    startDate: created.start_date,
    dueDate: created.due_date,
    isComplete: created.is_complete,
  };
  const editPromise = api.functional.multiUserTodo.member.todos.updateTodo(
    memberConnection,
    {
      todoId: created.id,
      body: editBody,
    },
  );
  const deletePromise = api.functional.multiUserTodo.member.todos.erase(
    memberConnection,
    { todoId: created.id },
  );
  const [viewResult, editResult, deleteResult] = await Promise.allSettled([
    viewPromise,
    editPromise,
    deletePromise,
  ]);
  // DELETE must succeed
  TestValidator.predicate(
    "delete should succeed",
    deleteResult.status === "fulfilled",
  );
  // 4. After settle, todo must be non-retrievable
  await TestValidator.error(
    "deleted todo must be non-retrievable",
    async () => {
      const after = await api.functional.multiUserTodo.member.todos.at(
        memberConnection,
        { todoId: created.id },
      );
      typia.assert(after);
    },
  );
  // 5. If view/edit succeeded, ensure returned todo is not left active.
  const maybeValidateDeleted = (value: IMultiUserTodoTodo): void => {
    typia.assert(value);
    TestValidator.predicate(
      "returned todo must be deleted or otherwise non-active after delete precedence",
      value.deleted_at !== null,
    );
  };
  if (viewResult.status === "fulfilled") {
    maybeValidateDeleted(viewResult.value);
  }
  if (editResult.status === "fulfilled") {
    maybeValidateDeleted(editResult.value);
  }
}
