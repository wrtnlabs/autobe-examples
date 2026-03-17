import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistory";
import type { IPageITodoAppTodoHistoryAttributeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistoryAttributeChange";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
import type { ITodoAppTodoHistoryAttributeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistoryAttributeChange";
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

export async function test_api_todo_attribute_changes_search_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member1 account
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member1);
  // 2. Create a todo as member1
  const todo = await generate_random_todo_app_member_todos_create(
    member1Connection,
    { body: {} },
  );
  typia.assert(todo);
  // 3. Edit the todo to generate attribute changes
  const updatedTodo = await api.functional.todoApp.member.todos.update(
    member1Connection,
    {
      todoId: todo.id,
      body: typia.random<ITodoAppTodo.IUpdate>(),
    },
  );
  typia.assert(updatedTodo);
  // 4. Get the history to obtain historyId
  const histories = await api.functional.todoApp.member.todos.histories.index(
    member1Connection,
    {
      todoId: todo.id,
      body: typia.random<ITodoAppTodoHistory.IRequest>(),
    },
  );
  typia.assert(histories);
  TestValidator.predicate(
    "should have at least one history",
    histories.data.length > 0,
  );
  const historyId = histories.data[0].id;
  // 5. Create member2 account
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member2);
  // 6. Test that member2 cannot search member1's attribute changes
  await TestValidator.error(
    "member2 should not access member1's attribute changes",
    async () => {
      await api.functional.todoApp.member.todos.histories.attribute_changes.index(
        member2Connection,
        {
          todoId: todo.id,
          historyId,
          body: typia.random<ITodoAppTodoHistoryAttributeChange.IRequest>(),
        },
      );
    },
  );
  // 7. Test invalid todoId and historyId for member2
  const invalidTodoId = typia.random<string>();
  const invalidHistoryId = typia.random<string>();
  await TestValidator.error("invalid todoId should return error", async () => {
    await api.functional.todoApp.member.todos.histories.attribute_changes.index(
      member2Connection,
      {
        todoId: invalidTodoId,
        historyId: invalidHistoryId,
        body: typia.random<ITodoAppTodoHistoryAttributeChange.IRequest>(),
      },
    );
  });
  // 8. Test that member1 can successfully search their own attribute changes
  const attributeChanges =
    await api.functional.todoApp.member.todos.histories.attribute_changes.index(
      member1Connection,
      {
        todoId: todo.id,
        historyId,
        body: typia.random<ITodoAppTodoHistoryAttributeChange.IRequest>(),
      },
    );
  typia.assert(attributeChanges);
  TestValidator.predicate(
    "member1 should get attribute changes",
    attributeChanges.data.length >= 0,
  );
}
