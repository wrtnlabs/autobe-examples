import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppEditHistory";
import type { ITodoAppEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEditHistory";
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

export async function test_api_edit_history_cross_user_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A registers and authenticates
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Member A creates a todo
  const memberATodo = await generate_random_todo_app_member_todos_create(
    memberAConnection,
    {},
  );
  typia.assert(memberATodo);
  // 3. Member A edits the todo to generate an edit history entry
  const updatedTodo = await api.functional.todoApp.member.todos.update(
    memberAConnection,
    {
      todoId: memberATodo.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.IUpdate,
    },
  );
  typia.assert(updatedTodo);
  // 4. Member A verifies their own edit history is accessible
  const memberAHistory =
    await api.functional.todoApp.member.todos.edit_histories.index(
      memberAConnection,
      {
        todoId: memberATodo.id,
        body: {} satisfies ITodoAppEditHistory.IRequest,
      },
    );
  typia.assert(memberAHistory);
  TestValidator.predicate(
    "Member A should see at least one edit history entry after editing",
    memberAHistory.data.length > 0,
  );
  // 5. Member B registers as a completely separate member
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 6. Member B attempts to access Member A's edit history — must be denied
  await TestValidator.error(
    "Member B cannot access Member A's edit history",
    async () => {
      await api.functional.todoApp.member.todos.edit_histories.index(
        memberBConnection,
        {
          todoId: memberATodo.id,
          body: {} satisfies ITodoAppEditHistory.IRequest,
        },
      );
    },
  );
}
