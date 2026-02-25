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

export async function test_api_user_trash_search_empty(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // Register and authenticate a new user
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.IJoin,
  });
  // Search trash with basic pagination parameters
  const trashResponse = await api.functional.todoApp.user.todos.trash.index(
    userConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ITodoAppTrashItem.IRequest,
    },
  );
  typia.assert(trashResponse);
  // Validate pagination metadata for empty trash
  TestValidator.equals("data array empty", trashResponse.data, []);
  TestValidator.equals(
    "current page should be 1",
    trashResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should match request",
    trashResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "total records should be 0",
    trashResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages should be 0",
    trashResponse.pagination.pages,
    0,
  );
}
