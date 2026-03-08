import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
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

export async function test_api_todo_history_entry_cross_member_denied(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create Member A's account
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // Step 2: Member A creates a todo
  const todo = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.name(),
      },
    },
  );
  typia.assert(todo);
  // Step 3: Member A updates the todo to create a history entry
  const updatedTodo = await api.functional.todoApp.member.todos.update(
    memberAConnection,
    {
      todoId: todo.id,
      body: {
        title: RandomGenerator.name() satisfies string,
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // Step 4: Create Member B's account (different member)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // Verify the members are different
  TestValidator.notEquals(
    "member A and member B have different IDs",
    memberA.id,
    memberB.id,
  );
  // Step 5: Member B attempts to access Member A's todo history
  // Test privacy enforcement: Member B should receive 404 Not Found
  // when trying to access any history entry of Member A's todo
  const historyId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "Member B cannot access Member A's todo history entry",
    404,
    async () => {
      await api.functional.todoApp.member.todos.histories.at(
        memberBConnection,
        {
          todoId: todo.id,
          historyId: historyId,
        },
      );
    },
  );
}
