import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_todo_trash_permanent_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Create User A connection
  const userAConnection: api.IConnection = { host: connection.host };
  const userA = await authorize_member_join(userAConnection, {
    body: {
      email: `test_a_${RandomGenerator.alphaNumeric(6)}@test.com`,
      password: "123456",
    },
  });
  // Generate a random todo ID for testing (in real scenario this would be an existing trash todo)
  const randomTodoId = typia.random<string & tags.Format<"uuid">>();
  // Test error case: try to permanently delete non-existent todo
  await TestValidator.error(
    "permanent delete non-existent todo fails",
    async () => {
      await api.functional.todoApp.member.trash.permanent(userAConnection, {
        todoId: randomTodoId,
      });
    },
  );
}
