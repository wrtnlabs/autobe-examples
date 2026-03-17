import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_todo_soft_delete_non_existent_error(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new connection for member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  // 2. Authenticate as a member
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.Format<"password">
      >(),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // 3. Generate a random todoId that doesn't exist
  const nonExistentTodoId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Attempt to delete non-existent todo and expect 404 error
  await TestValidator.httpError(
    "non-existent todo deletion should return 404",
    404,
    async () => {
      await api.functional.multiUserTodo.member.todos.erase(memberConnection, {
        todoId: nonExistentTodoId,
      });
    },
  );
}
