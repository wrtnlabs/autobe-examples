import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMember";
import type { IMultiUserTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppTodo";
import type { IMultiUserTodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppTodoEditHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoAppTodoEditHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_multi_user_todo_app_member_todos_create } from "../../../generate/generate_random_multi_user_todo_app_member_todos_create";
import { prepare_random_multi_user_todo_app_todo } from "../../../prepare/prepare_random_multi_user_todo_app_todo";

export async function test_api_edit_history_viewing_owned_todo(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member and create authenticated connection
  const joinConnection: api.IConnection = { host: connection.host };
  const member: IMultiUserTodoAppMember.IAuthorized =
    await authorize_member_join(joinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IMultiUserTodoAppMember.IJoin,
    });
  typia.assert(member);
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: member.token.access,
  };
  // Step 2: Create initial todo with all fields (creates first history entry)
  const todo: IMultiUserTodoAppTodo =
    await api.functional.multiUserTodoApp.member.todos.create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 6,
          }),
          description: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 6,
          }),
          startDate: RandomGenerator.date(
            new Date(),
            1000 * 60 * 60 * 24 * 30,
          ).toISOString(),
          dueDate: RandomGenerator.date(
            new Date(),
            1000 * 60 * 60 * 24 * 60,
          ).toISOString(),
        } satisfies IMultiUserTodoAppTodo.ICreate,
      },
    );
  typia.assert(todo);
  // Step 3: Request the edit history
  const history: IPageIMultiUserTodoAppTodoEditHistory.ISummary =
    await api.functional.multiUserTodoApp.member.todos.history.at(
      memberConnection,
      {
        todoId: todo.id,
      },
    );
  typia.assert(history);
  // Step 4: Validate the edit history
  TestValidator.equals("has history entry", history.data.length, 1);
  TestValidator.equals("total records matches", history.pagination.records, 1);
  TestValidator.equals("pages correct", history.pagination.pages, 1);
  // Verify the history entry contains correct creation values
  const entry = history.data[0];
  TestValidator.equals("history has old title as null", entry.oldTitle, null);
  TestValidator.equals(
    "history has new title from creation",
    entry.newTitle,
    todo.title,
  );
  TestValidator.equals(
    "history has old description as null",
    entry.oldDescription,
    null,
  );
  TestValidator.equals(
    "history has new description from creation",
    entry.newDescription,
    todo.description,
  );
  TestValidator.equals(
    "history has old start date as null",
    entry.oldStartDate,
    null,
  );
  TestValidator.equals(
    "history has new start date from creation",
    entry.newStartDate,
    todo.startDate,
  );
  TestValidator.equals(
    "history has old due date as null",
    entry.oldDueDate,
    null,
  );
  TestValidator.equals(
    "history has new due date from creation",
    entry.newDueDate,
    todo.dueDate,
  );
  // Verify edit timestamp exists and is valid
  TestValidator.predicate("entry has valid timestamp", () => {
    const date = new Date(entry.editedAt);
    return !isNaN(date.getTime()) && date <= new Date();
  });
}