import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTrashItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTrashItem";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppTrashItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashItem";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_trash_retrieval_empty_trash(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // Register a new user using available SDK function (not utility function)
  const userJoinResponse = await api.functional.todoApp.auth.user.join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      },
    },
  );
  typia.assert(userJoinResponse);
  // Update user connection with authorization token
  userConnection.headers = {
    Authorization: userJoinResponse.token.access,
  };
  // Create some active todos that remain undeleted
  const todoCount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
  >();
  for (let i = 0; i < todoCount; i++) {
    await api.functional.todoApp.user.todos.create(userConnection);
  }
  // Retrieve trash - should be empty since no todos were deleted
  const trashResponse =
    await api.functional.todoApp.user.trash.get(userConnection);
  typia.assert(trashResponse);
  // Validate empty trash response structure
  TestValidator.equals("data array is empty", trashResponse.data.length, 0);
  TestValidator.equals(
    "records count is 0",
    trashResponse.pagination.records,
    0,
  );
  TestValidator.equals("pages count is 0", trashResponse.pagination.pages, 0);
  TestValidator.predicate(
    "current page is valid",
    trashResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is valid",
    trashResponse.pagination.limit >= 0,
  );
}
