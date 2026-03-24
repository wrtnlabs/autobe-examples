import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistoryEntry";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistoryEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_todos_create } from "../../../generate/generate_random_todo_app_member_todos_create";
import { generate_random_todo_app_member_todos_history_create_todo_history_entry } from "../../../generate/generate_random_todo_app_member_todos_history_create_todo_history_entry";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";
import { prepare_random_todo_app_todo_history_entry } from "../../../prepare/prepare_random_todo_app_todo_history_entry";

export async function test_api_todo_history_entries_changed_fields_null_for_unchanged(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2) Create a todo (member-owned)
  const todo = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: null,
        start_date: null,
        due_date: null,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  const todoId = todo.id;
  // 3) Create two distinct edit-history entries for the same todo
  const titleOnly = RandomGenerator.paragraph({ sentences: 1 });
  await generate_random_todo_app_member_todos_history_create_todo_history_entry(
    memberConnection,
    {
      params: { todoId },
      body: {
        changedTitle: titleOnly,
        changedDescription: null,
        changedStartDate: null,
        changedDueDate: null,
        changedCompletionStatus: null,
      } satisfies ITodoAppTodoHistoryEntry.ICreate,
    },
  );
  const descriptionOnly = RandomGenerator.paragraph({ sentences: 2 });
  await generate_random_todo_app_member_todos_history_create_todo_history_entry(
    memberConnection,
    {
      params: { todoId },
      body: {
        changedTitle: null,
        changedDescription: descriptionOnly,
        changedStartDate: null,
        changedDueDate: null,
        changedCompletionStatus: null,
      } satisfies ITodoAppTodoHistoryEntry.ICreate,
    },
  );
  // 4) Retrieve history entries (newest-to-oldest)
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 10 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const pageResult =
    await api.functional.todoApp.member.todos.history_entries.index(
      memberConnection,
      {
        todoId,
        body: { page, limit },
      },
    );
  typia.assert(pageResult);
  const summaries = pageResult.data;
  TestValidator.predicate(
    "should return at least 2 history entries",
    summaries.length >= 2,
  );
  // Verify created_at ordering newest-to-oldest
  const createdAts = summaries.map((x) => x.created_at);
  for (let i = 0; i + 1 < createdAts.length; i++) {
    TestValidator.predicate(
      `created_at ordering at ${i}`,
      new Date(createdAts[i]).getTime() >=
        new Date(createdAts[i + 1]).getTime(),
    );
  }
  const titleEntry = summaries.find((x) => x.changed_title !== null);
  const descriptionEntry = summaries.find(
    (x) => x.changed_description !== null,
  );
  TestValidator.predicate(
    "should find title-only changed entry",
    () => titleEntry !== undefined,
  );
  TestValidator.predicate(
    "should find description-only changed entry",
    () => descriptionEntry !== undefined,
  );
  TestValidator.equals(
    "title-only changed_title matches input",
    titleEntry!.changed_title,
    titleOnly,
  );
  TestValidator.equals(
    "title-only changed_description is null",
    titleEntry!.changed_description,
    null,
  );
  TestValidator.equals(
    "title-only changed_start_date is null",
    titleEntry!.changed_start_date,
    null,
  );
  TestValidator.equals(
    "title-only changed_due_date is null",
    titleEntry!.changed_due_date,
    null,
  );
  TestValidator.equals(
    "title-only changed_completion_status is null",
    titleEntry!.changed_completion_status,
    null,
  );
  TestValidator.equals(
    "title-only deleted_at is null",
    titleEntry!.deleted_at,
    null,
  );
  TestValidator.equals(
    "description-only changed_description matches input",
    descriptionEntry!.changed_description,
    descriptionOnly,
  );
  TestValidator.equals(
    "description-only changed_title is null",
    descriptionEntry!.changed_title,
    null,
  );
  TestValidator.equals(
    "description-only changed_start_date is null",
    descriptionEntry!.changed_start_date,
    null,
  );
  TestValidator.equals(
    "description-only changed_due_date is null",
    descriptionEntry!.changed_due_date,
    null,
  );
  TestValidator.equals(
    "description-only changed_completion_status is null",
    descriptionEntry!.changed_completion_status,
    null,
  );
  TestValidator.equals(
    "description-only deleted_at is null",
    descriptionEntry!.deleted_at,
    null,
  );
}
