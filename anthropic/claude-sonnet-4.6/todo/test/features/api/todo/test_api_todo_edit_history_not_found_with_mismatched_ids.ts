import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
import type { ITodoAppUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserProfile";
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

export async function test_api_todo_edit_history_not_found_with_mismatched_ids(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member and establish authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create Todo A
  const todoA = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {},
  );
  typia.assert(todoA);
  // 3. Edit Todo A to generate a history entry (historyId A)
  const updatedTodoA = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todoA.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        is_completed: false,
        started_at: null,
        due_at: null,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodoA);
  // 4. Create Todo B
  const todoB = await generate_random_todo_app_member_todos_create(
    memberConnection,
    {},
  );
  typia.assert(todoB);
  // 5. Edit Todo B to generate a history entry (historyId B)
  const updatedTodoB = await api.functional.todoApp.member.todos.update(
    memberConnection,
    {
      todoId: todoB.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        is_completed: true,
        started_at: null,
        due_at: null,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodoB);
  // Case 1: Mismatched composite key — a random historyId supplied with
  // todoB's todoId. The composite lookup (WHERE id = historyId AND
  // todo_app_todo_id = todoId) must reject this even though both resources
  // belong to the same member.
  const mismatchedHistoryId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "mismatched historyId and todoId should return 404",
    async () => {
      await api.functional.todoApp.member.todos.editHistories.at(
        memberConnection,
        {
          todoId: todoB.id,
          historyId: mismatchedHistoryId,
        },
      );
    },
  );
  // Case 2: Non-existent historyId with a valid todoId (Todo A)
  const nonExistentHistoryId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent historyId with valid todoId should return 404",
    async () => {
      await api.functional.todoApp.member.todos.editHistories.at(
        memberConnection,
        {
          todoId: todoA.id,
          historyId: nonExistentHistoryId,
        },
      );
    },
  );
  // Case 3: Non-existent todoId — parent todo lookup must fail first
  const nonExistentTodoId = typia.random<string & tags.Format<"uuid">>();
  const anyHistoryId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent todoId should return 404",
    async () => {
      await api.functional.todoApp.member.todos.editHistories.at(
        memberConnection,
        {
          todoId: nonExistentTodoId,
          historyId: anyHistoryId,
        },
      );
    },
  );
}
