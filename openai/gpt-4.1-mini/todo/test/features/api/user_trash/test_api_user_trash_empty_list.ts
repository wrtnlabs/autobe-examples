import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_trash_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user and authorize
  const userConnection: api.IConnection = { host: connection.host };
  const joinOutput = await authorize_user_join(userConnection, {
    body: {
      email: `emptytrash-${RandomGenerator.alphaNumeric(6)}@test.com`,
      password: "pwd12345",
    } satisfies IMultiUserTodoUser.IJoin,
  });
  userConnection.headers = { Authorization: joinOutput.token.access };
  // 2. Access trash endpoint expecting empty paginated result
  const trashOutput =
    await api.functional.multiUserTodo.user.trash.index(userConnection);
  typia.assert(trashOutput);
  // 3. Validate empty list and pagination metadata for correctness
  TestValidator.equals("trash data is empty", trashOutput.data.length, 0);
  TestValidator.predicate(
    "pagination current page is positive",
    trashOutput.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    trashOutput.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records count is zero for empty trash",
    trashOutput.pagination.records === 0,
  );
  TestValidator.predicate(
    "pagination pages count is zero for empty trash",
    trashOutput.pagination.pages === 0,
  );
}
