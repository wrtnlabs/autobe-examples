import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
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

export async function test_api_todo_active_list_all_todos_excludes_trash(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joined);
  const keyword = `active-list-${RandomGenerator.alphaNumeric(8)}`;
  const activeIncompleteInput = {
    title: `${keyword}-incomplete`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    startDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
  } satisfies ITodoAppTodo.ICreate;
  const activeCompleteInput = {
    title: `${keyword}-complete`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    startDate: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
  } satisfies ITodoAppTodo.ICreate;
  const activeIncomplete = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {
      body: activeIncompleteInput,
    },
  );
  typia.assert(activeIncomplete);
  const activeCompleteCreated =
    await generate_random_todo_app_member_todos_create(memberConnection, {
      body: activeCompleteInput,
    });
  typia.assert(activeCompleteCreated);
  const activeComplete = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: activeCompleteCreated.id,
      body: {
        title: activeCompleteCreated.title,
        description: activeCompleteCreated.description,
        start_date: activeCompleteCreated.start_date,
        due_date: activeCompleteCreated.due_date,
        completed: true,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(activeComplete);
  const page = await api.functional.todoApp.member.todos.index(
    memberConnection,
    {
      body: {
        search: keyword,
        completed: "all",
        sort: "updated_at_desc",
        page: 1,
        limit: 10,
      } satisfies ITodoAppTodo.IRequest,
    },
  );
  typia.assert(page);
  TestValidator.equals(
    "current page matches request",
    page.pagination.current,
    1,
  );
  TestValidator.equals("page limit matches request", page.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records populated",
    page.pagination.records >= 2,
  );
  TestValidator.predicate(
    "pagination pages populated",
    page.pagination.pages >= 1,
  );
  TestValidator.equals("matching summaries count", page.data.length, 2);
  const returnedIds = [...page.data.map((todo) => todo.id)].sort();
  const expectedIds = [activeIncomplete.id, activeComplete.id].sort();
  TestValidator.equals(
    "returned ids match created active todos",
    returnedIds,
    expectedIds,
  );
  for (const summary of page.data) {
    TestValidator.predicate(
      "summary title matches scoped keyword",
      summary.title.includes(keyword),
    );
    TestValidator.predicate(
      "active list contains only non-trashed summaries",
      summary.deleted_at === null,
    );
  }
  const incompleteSummary = page.data.find(
    (todo) => todo.id === activeIncomplete.id,
  );
  const completeSummary = page.data.find(
    (todo) => todo.id === activeComplete.id,
  );
  typia.assertGuard<ITodoAppTodo.ISummary>(incompleteSummary);
  typia.assertGuard<ITodoAppTodo.ISummary>(completeSummary);
  TestValidator.equals(
    "incomplete summary keeps completion state",
    incompleteSummary.completed,
    false,
  );
  TestValidator.equals(
    "completed summary keeps completion state",
    completeSummary.completed,
    true,
  );
  TestValidator.equals(
    "incomplete summary title matches created todo",
    incompleteSummary.title,
    activeIncomplete.title,
  );
  TestValidator.equals(
    "completed summary title matches updated todo",
    completeSummary.title,
    activeComplete.title,
  );
}
