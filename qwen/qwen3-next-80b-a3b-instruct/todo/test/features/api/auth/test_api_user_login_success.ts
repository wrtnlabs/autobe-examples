import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_user_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a valid user account for login testing
  const userConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const createdUser: ITodoAppUser.IAuthorized = await authorize_user_join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password,
      },
    },
  );
  typia.assert(createdUser);
  // Step 2: Use the created user's credentials to authenticate
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedUser: ITodoAppUser.IAuthorized = await authorize_user_login(
    loginConnection,
    {
      body: {
        email: createdUser.email,
        password,
      },
    },
  );
  typia.assert(loggedUser);
  // Step 3: Validate business logic fields that should match between join and login
  TestValidator.equals("email matches", loggedUser.email, createdUser.email);
  TestValidator.equals(
    "username matches",
    loggedUser.username,
    createdUser.username,
  );
  TestValidator.equals("user id matches", loggedUser.id, createdUser.id);
  TestValidator.equals(
    "created_at matches",
    loggedUser.created_at,
    createdUser.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    loggedUser.updated_at,
    createdUser.updated_at,
  );
  TestValidator.equals("token exists", loggedUser.token !== null, true);
  TestValidator.equals(
    "access token exists",
    typeof loggedUser.token.access === "string",
    true,
  );
  TestValidator.equals(
    "refresh token exists",
    typeof loggedUser.token.refresh === "string",
    true,
  );
}
