import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test immediate login after member registration.
 *
 * Validates the complete user onboarding flow from new account creation to immediate authentication. A member successfully registers with a unique email address and password. Then, without delay, the same registered member immediately submits login credentials to authenticate. Verifies that the system successfully handles the transition by finding the newly created account, validating credentials, creating an active session, and returning valid authentication tokens.
 *
 * Special attention is given to verifying that the registration response contains proper authorization tokens and that the login response maintains the same member identity.
 *
 * 1. Register a new member with unique email and password.
 * 2. Immediately login with the same credentials.
 * 3. Validate registration response contains authorization tokens.
 * 4. Validate login response contains authorization tokens.
 * 5. Verify email consistency between registration and login responses.
 */
export async function test_api_member_login_after_registration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create actor-specific connection for member registration
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate unique credentials for registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // 2. Register new member
  const joinResponse = await authorize_member_join(memberConnection, {
    body: {
      email: email,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(joinResponse);
  // 3. Create new connection for login (authorization tokens are set after join)
  const loginConnection: api.IConnection = { host: connection.host };
  // 4. Immediately login with same credentials
  const loginResponse = await authorize_member_login(loginConnection, {
    body: {
      email: email,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.ILogin,
  });
  typia.assert(loginResponse);
  // 5. Validate email consistency
  TestValidator.equals(
    "email matches between join and login",
    loginResponse.email,
    joinResponse.email,
  );
  // 6. Validate login response has valid token
  TestValidator.predicate(
    "login has access token",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "login has refresh token",
    loginResponse.token.refresh.length > 0,
  );
}
