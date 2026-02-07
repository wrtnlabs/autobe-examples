import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppTodoTrash } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoTrash";
import type { ITodoAppTodoTrash } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoTrash";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_todo_trash_empty(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies ITodoAppUser.IJoin,
  });
  // Step 2: Query empty trash list
  const trashList = await api.functional.todoApp.user.trash.index(
    userConnection,
    {
      body: {} satisfies ITodoAppTodoTrash.IRequest,
    },
  );
  typia.assert(trashList);
  // Step 3: Validate empty trash response
  TestValidator.equals(
    "pagination total records",
    trashList.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination current page",
    trashList.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", trashList.pagination.limit, 10);
  TestValidator.equals("pagination pages", trashList.pagination.pages, 0);
  TestValidator.equals("data array length", trashList.data.length, 0);
}
