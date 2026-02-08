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

export async function test_api_user_trash_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // Register two different users
  const user1Connection: api.IConnection = { host: connection.host };
  const user1Authorized = await authorize_user_join(user1Connection, {
    body: {
      email: `${RandomGenerator.alphabets(6)}@example.com`,
      password: "Password123!",
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoUser.IJoin,
  });
  user1Connection.headers = {
    Authorization: `Bearer ${user1Authorized.token.access}`,
  };
  const user2Connection: api.IConnection = { host: connection.host };
  const user2Authorized = await authorize_user_join(user2Connection, {
    body: {
      email: `${RandomGenerator.alphabets(6)}@example.com`,
      password: "Password123!",
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoUser.IJoin,
  });
  user2Connection.headers = {
    Authorization: `Bearer ${user2Authorized.token.access}`,
  };
  // Fetch trash list for user1
  const user1Trash =
    await api.functional.multiUserTodo.user.trash.index(user1Connection);
  typia.assert(user1Trash);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is positive",
    user1Trash.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    user1Trash.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    user1Trash.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    user1Trash.pagination.pages >= 0,
  );
  // Validate data array presence
  TestValidator.predicate(
    "trashed todos returned is an array",
    Array.isArray(user1Trash.data),
  );
  // Due to the missing properties in ISummary, cannot validate deleted_at or user ownership here
}
