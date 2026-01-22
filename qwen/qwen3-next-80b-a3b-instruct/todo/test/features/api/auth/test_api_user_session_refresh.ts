import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoListToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_user_session_refresh(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate user to get initial tokens
  const userConnection: api.IConnection = { host: connection.host };
  const user: ITodoListUser.IAuthorized = await authorize_member_join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ITodoListUser.IJoin,
    },
  );
  typia.assert(user);
  // Step 2: Extract the refresh token from the initial authentication
  const refreshToken = user.token.refresh;
  // Step 3: Create a new connection for refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // Step 4: Use the refresh token to obtain new tokens
  const refreshed: ITodoListUser.IAuthorized = await authorize_member_refresh(
    refreshConnection,
    {
      body: {
        token: refreshToken,
      } satisfies ITodoListUser.IRefresh,
    },
  );
  typia.assert(refreshed);
  // Step 5: Validate that the refreshed response contains updated tokens
  TestValidator.equals("user ID should match", refreshed.id, user.id);
  TestValidator.equals("user email should match", refreshed.email, user.email);
  TestValidator.equals(
    "refresh token should be rotated",
    refreshed.token.refresh !== refreshToken,
    true,
  );
  TestValidator.predicate(
    "access token should exist",
    () => !!refreshed.token.access,
  );
  TestValidator.predicate(
    "refresh token should exist",
    () => !!refreshed.token.refresh,
  );
}
