import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_todo_trash_restore_owner_only(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberACredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: false,
  } satisfies ITodoAppMember.IJoin;
  const memberBCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: false,
  } satisfies ITodoAppMember.IJoin;
  const memberA = await api.functional.todoApp.auth.member.join(
    memberAConnection,
    {
      body: memberACredentials,
    },
  );
  typia.assert(memberA);
  const memberB = await api.functional.todoApp.auth.member.join(
    memberBConnection,
    {
      body: memberBCredentials,
    },
  );
  typia.assert(memberB);
  await TestValidator.error(
    "member B cannot restore an arbitrary trashed todo id",
    async () => {
      await api.functional.todoApp.member.todos.trash.putByTodoid(
        memberBConnection,
        {
          todoId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
