import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoUser";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_user_profile_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new user account using utility function (not SDK)
  const userConnection: api.IConnection = { host: connection.host };
  const createdUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(createdUser);
  // 2. Search for user profiles with the authenticated connection
  const searchResult = await api.functional.todo.user.users.index(
    userConnection,
    {
      body: {} satisfies ITodoUser.IRequest,
    },
  );
  typia.assert(searchResult);
  // 3. Verify search results contain exactly one profile (current user)
  TestValidator.equals(
    "profile count should be exactly 1",
    searchResult.data.length,
    1,
  );
  TestValidator.equals(
    "returned profile should match created user",
    searchResult.data[0].id,
    createdUser.id,
  );
  TestValidator.equals(
    "returned profile display name should match created user",
    searchResult.data[0].display_name,
    createdUser.displayName,
  );
}
