import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful member login with valid email and password credentials.
 *
 * Validates the complete member authentication flow including account registration and login. Verifies that after registering a new member account, the member can authenticate using their registered email and password credentials. The test ensures the response contains valid JWT access and refresh tokens, member account information including id, email, status (active), and profile data.
 *
 * Special attention is given to verifying that the authentication tokens are properly formatted and contain the expected expiration timestamps. The member status is validated to confirm successful authentication with 'active' status.
 *
 * 1. Register a new member account with unique email and password using authorize_member_join utility function.
 * 2. Store the registration credentials (email, password) for login testing.
 * 3. Create a new connection for login authentication.
 * 4. Login using authorize_member_login utility function with the registered credentials.
 * 5. Validate the login response contains all required fields: id, email, status, profile, created_at, updated_at, deleted_at, and token.
 * 6. Validate the token object contains access, refresh, expired_at, and refreshable_until fields.
 * 7. Verify the member status is 'active' indicating successful authentication.
 * 8. Confirm the email in the response matches the registered email.
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account
  const joinCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallMember.IJoin;
  const joinResult: IShoppingMallMember.IAuthorized =
    await authorize_member_join(connection, {
      body: joinCredentials,
    });
  typia.assert(joinResult);
  // 2. Create new connection for login
  const loginConnection: api.IConnection = { host: connection.host };
  // 3. Login with registered credentials
  const loginInput = {
    email: joinCredentials.email,
    password: joinCredentials.password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallMember.ILogin;
  const loginResult: IShoppingMallMember.IAuthorized =
    await authorize_member_login(loginConnection, {
      body: loginInput,
    });
  typia.assert(loginResult);
  // 4. Validate business logic - email matches and status is active
  TestValidator.equals(
    "email matches registered email",
    loginResult.email,
    joinCredentials.email,
  );
  TestValidator.equals("status is active", loginResult.status, "active");
}
