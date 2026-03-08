import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppEditHistory";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_todo_edit_history_todo_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member session
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Try to retrieve edit history with non-existent todoId
  await TestValidator.httpError(
    "should return 404 when todo does not exist",
    [404],
    async () => {
      await api.functional.todoApp.member.todos.history.getByTodoidAndHistoryid(
        memberConnection,
        {
          todoId: typia.random<string & tags.Format<"uuid">>(),
          historyId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 3. Test with multiple different non-existent todoIds
  const nonExistentTodoIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  for (const todoId of nonExistentTodoIds) {
    await TestValidator.httpError(
      `should return 404 for todoId ${todoId}`,
      [404],
      async () => {
        await api.functional.todoApp.member.todos.history.getByTodoidAndHistoryid(
          memberConnection,
          {
            todoId,
            historyId: typia.random<string & tags.Format<"uuid">>(),
          },
        );
      },
    );
  }
}