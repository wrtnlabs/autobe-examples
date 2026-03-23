import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppEditHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEditHistoryEntry";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
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

export async function test_api_member_edit_history_cross_user_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first member (todo owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerData = {
    email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.assert<string & tags.Format<"uri">>(typia.random<string & tags.Format<"uri">>()),
    referrer: typia.assert<string & tags.Format<"uri">>(typia.random<string & tags.Format<"uri">>()),
  } satisfies ITodoAppMemberSession.IJoin;
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: ownerData,
  });
  // 2. Create a todo as owner
  const todo = await api.functional.todoApp.member.todos.create(
    ownerConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppTodo.ICreate,
    },
  );
  typia.assert(todo);
  // 3. Register second member (attempting cross-user access)
  const intruderConnection: api.IConnection = { host: connection.host };
  const intruderData = {
    email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.assert<string & tags.Format<"uri">>(typia.random<string & tags.Format<"uri">>()),
    referrer: typia.assert<string & tags.Format<"uri">>(typia.random<string & tags.Format<"uri">>()),
  } satisfies ITodoAppMemberSession.IJoin;
  await authorize_member_join(intruderConnection, { body: intruderData });
  // 4. Attempt to access edit history of owner's todo (should fail)
  await TestValidator.error(
    "cannot access other user's edit history",
    async () => {
      await api.functional.todoApp.member.todos.history.at(intruderConnection, {
        todoId: todo.id,
      });
    },
  );
}