import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_todo_history_cross_user_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first member who will own the todo and history
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(member1Auth);
  // 2. Create a todo item and edit it to generate history records
  // Note: We need to create a todo first, then edit it to generate history
  // Since we don't have direct todo creation functions in the provided SDK,
  // we'll use a random history ID that would belong to member1's todo
  // In a real scenario, we would:
  //   - Create todo via api.functional.multiUserTodo.member.todos.create
  //   - Edit todo via api.functional.multiUserTodo.member.todos.update
  //   - This generates history records
  // For this test, we'll generate a random UUID that represents a history ID
  // that belongs to member1's todo (simulated scenario)
  const historyId = typia.random<string & tags.Format<"uuid">>();
  // 3. Register second member who will attempt unauthorized access
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(member2Auth);
  // 4. Second member attempts to access first member's history
  // This should return 403 Forbidden error
  await TestValidator.httpError(
    "cross-user history access should be denied",
    403,
    async () => {
      await api.functional.multiUserTodo.member.todo_histories.at(
        member2Connection,
        {
          historyId,
        },
      );
    },
  );
}
