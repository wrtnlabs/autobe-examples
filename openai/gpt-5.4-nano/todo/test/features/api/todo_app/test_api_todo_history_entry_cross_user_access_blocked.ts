import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_todo_history_entry_cross_user_access_blocked(
  connection: api.IConnection,
): Promise<void> {
  // Member A setup
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  const memberATodo = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: null,
        start_date: null,
        due_date: null,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(memberATodo);
  const memberAHist =
    await generate_random_todo_app_member_todos_history_create_todo_history_entry(
      memberAConnection,
      {
        params: { todoId: memberATodo.id },
        body: {
          changedTitle: RandomGenerator.name(),
          changedDescription: null,
          changedStartDate: null,
          changedDueDate: null,
          changedCompletionStatus: typia.random<string>(),
        } satisfies ITodoAppTodoHistoryEntry.ICreate,
      },
    );
  typia.assert(memberAHist);
  // Member B setup
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  // Cross-user access should be blocked
  await TestValidator.error(
    "member B cannot access member A todo history entry",
    async () => {
      await api.functional.todoApp.member.todos.history.at(memberBConnection, {
        todoId: memberATodo.id,
        historyEntryId: memberAHist.id,
      });
    },
  );
  // Member B can access their own data
  const memberBTodo = await generate_random_todo_app_member_todos_create(
    memberBConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: null,
        start_date: null,
        due_date: null,
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(memberBTodo);
  const memberBHist =
    await generate_random_todo_app_member_todos_history_create_todo_history_entry(
      memberBConnection,
      {
        params: { todoId: memberBTodo.id },
        body: {
          changedTitle: RandomGenerator.name(),
          changedDescription: null,
          changedStartDate: null,
          changedDueDate: null,
          changedCompletionStatus: typia.random<string>(),
        } satisfies ITodoAppTodoHistoryEntry.ICreate,
      },
    );
  typia.assert(memberBHist);
  const memberBReadback = await api.functional.todoApp.member.todos.history.at(
    memberBConnection,
    {
      todoId: memberBTodo.id,
      historyEntryId: memberBHist.id,
    },
  );
  typia.assert(memberBReadback);
  // Ensure returned entry references requested todo id (privacy boundary sanity)
  TestValidator.equals(
    "history entry references requested todo id",
    memberBReadback.todo_app_todo_id,
    memberBTodo.id,
  );
}
