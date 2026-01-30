import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAccessToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
/**
 * E2E test function to verify successful user login after registration.
 *
 * This test validates that a new user can join the todoApp and then login
 * successfully using the provided credentials. It ensures that the API returns
 * all expected authorization details and tokens.
 *
 * Workflow:
 *
 * 1. Register a new user with realistic data.
 * 2. Verify the registration result matches ITodoAppUser.IAuthorized.
 * 3. Login using the registered user's email and password.
 * 4. Verify the login result matches ITodoAppUser.IAuthorized.
 *
 * This confirms that the authentication system correctly issues tokens and user
 * details upon login, allowing the user to access authenticated endpoints
 * subsequently.
 */
export async function test_api_user_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for member user (join)
  const memberJoinConnection: api.IConnection = { host: connection.host };
  // Step 2: Register a new user with valid realistic data using authorize_member_join
  const joinInput = {
    username: RandomGenerator.alphaNumeric(8),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    href: `https://example.com/register`,
    referrer: `https://example.com/home`,
  } satisfies ITodoAppUser.IJoin;
  const authorizedJoin = await authorize_member_join(memberJoinConnection, {
    body: joinInput,
  });
  typia.assert(authorizedJoin);
  // Step 3: Create a new connection for member login
  const memberLoginConnection: api.IConnection = { host: connection.host };
  const loginInput = {
    email: joinInput.email,
    password: joinInput.password,
  } satisfies ITodoAppUser.ILogin;
  // Step 4: Login with registered user credentials using authorize_member_login
  const authorizedLogin = await authorize_member_login(memberLoginConnection, {
    body: loginInput,
  });
  typia.assert(authorizedLogin);
  // Step 5: Assert both registration and login results contain expected data
  TestValidator.predicate(
    "registered user has valid id",
    authorizedJoin.id.length === 36,
  );
  TestValidator.equals(
    "login email matches join email",
    authorizedLogin.email,
    joinInput.email,
  );
  TestValidator.equals(
    "login username matches join username",
    authorizedLogin.username,
    joinInput.username,
  );
  TestValidator.predicate(
    "login token has access string",
    typeof authorizedLogin.token.access === "string",
  );
  TestValidator.predicate(
    "login token has refresh string",
    typeof authorizedLogin.token.refresh === "string",
  );
  TestValidator.predicate(
    "login token expired_at is valid ISO string",
    typeof authorizedLogin.token.expired_at === "string",
  );
  TestValidator.predicate(
    "login token refreshable_until is valid ISO string",
    typeof authorizedLogin.token.refreshable_until === "string",
  );
}
