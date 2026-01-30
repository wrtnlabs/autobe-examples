import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicForumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumUser";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_user_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Generate random password and create a valid user account for login
  const password = RandomGenerator.alphaNumeric(10); // Generate 10-character alphanumeric password
  const joinConnection: api.IConnection = { host: connection.host };
  const registeredUser: IEconomicForumUser.IAuthorized =
    await authorize_user_join(joinConnection, {
      body: {},
    });
  typia.assert(registeredUser);
  // Step 2: Create a new connection for login attempt with the generated credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse: IEconomicForumUser.IAuthorized =
    await authorize_user_login(loginConnection, {
      body: {
        email: registeredUser.email,
        password: password,
      },
    });
  typia.assert(loginResponse);
  // Step 3: Validate the login response structure and ensure it matches the registered user
  TestValidator.equals("user id matches", loginResponse.id, registeredUser.id);
  TestValidator.equals(
    "email matches",
    loginResponse.email,
    registeredUser.email,
  );
  TestValidator.equals(
    "username matches",
    loginResponse.username,
    registeredUser.username,
  );
  TestValidator.equals(
    "created_at matches",
    loginResponse.created_at,
    registeredUser.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    loginResponse.updated_at,
    registeredUser.updated_at,
  );
  // Step 4: Validate token information
  TestValidator.equals(
    "access token exists",
    loginResponse.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token exists",
    loginResponse.token.refresh.length > 0,
    true,
  );
}
