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
export async function test_api_user_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new user account before testing login
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const userJoinData = {
    email,
    password,
  } satisfies ITodoListUser.IJoin;
  const createdUser: ITodoListUser.IAuthorized = await authorize_member_join(
    connection,
    {
      body: userJoinData,
    },
  );
  typia.assert(createdUser);
  // Step 2: Authenticate the created user with their credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const userLoginData = {
    email,
    password,
  } satisfies ITodoListUser.ILogin;
  const authenticatedUser: ITodoListUser.IAuthorized =
    await authorize_member_login(loginConnection, {
      body: userLoginData,
    });
  typia.assert(authenticatedUser);
  // Step 3: Validate that user information matches the created user
  TestValidator.equals("user ID matches", authenticatedUser.id, createdUser.id);
  TestValidator.equals(
    "user email matches",
    authenticatedUser.email,
    createdUser.email,
  );
  TestValidator.equals(
    "created at matches",
    authenticatedUser.createdAt,
    createdUser.createdAt,
  );
  // Step 4: Validate authentication token structure
  const token: ITodoListToken = authenticatedUser.token;
  // Verify token properties exist and are properly structured
  TestValidator.equals("access token is string", typeof token.access, "string");
  TestValidator.equals(
    "refresh token is string",
    typeof token.refresh,
    "string",
  );
  // Note: last_login_at database update cannot be validated as it's not exposed in API response
}
