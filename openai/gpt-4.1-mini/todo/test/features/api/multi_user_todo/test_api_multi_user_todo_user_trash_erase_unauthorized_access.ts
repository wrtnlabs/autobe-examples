import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_multi_user_todo_user_trash_erase_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // This scenario tests the behavior when an authenticated user attempts to permanently delete a todo that does not exist or is not owned by them. It is expected that the system responds with an error status code such as 404 Not Found or 403 Forbidden to prevent unauthorized deletion and ensure privacy. Prerequisite is a joined user authentication. This protects against unauthorized data access and ensures that ownership is strictly enforced for delete operations in the trash.
  // 1. Authenticate as a user (join)
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {}, // Using empty IJoin according to DTO definition
  });
  // 2. Generate a random todoId that does not exist or is not owned by this user
  const unauthorizedTodoId = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string & tags.Format<"uuid">;
  // 3. Attempt to erase the unauthorized todo and expect a 403 or 404 error
  await TestValidator.httpError(
    "unauthorized erase attempt",
    [403, 404],
    async () => {
      await api.functional.multiUserTodo.user.trash.erase(userConnection, {
        todoId: unauthorizedTodoId,
      });
    },
  );
}
