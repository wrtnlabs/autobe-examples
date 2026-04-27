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
 * Test successful member login with valid credentials.
 *
 * Validates the complete login flow by first registering a new member account with known credentials,
 * then authenticating via the login endpoint with the same credentials. Confirms that the login
 * response contains the correct member identity information matching the registered account.
 *
 * 1. Register a new member account with specific email, password, href, and referrer.
 * 2. Authenticate with the same email and password credentials via the login endpoint.
 * 3. Validate the authorized response structure and verify the email matches the registered value.
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate test credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  // 2. Register a new member with known credentials
  const joinConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(joinConnection, {
    body: {
      email,
      password,
      href,
      referrer,
    } satisfies ITodoAppMember.IJoin,
  });
  // 3. Login with the same credentials using a fresh connection
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email,
      password,
      href,
      referrer,
    } satisfies ITodoAppMember.ILogin,
  });
  typia.assert(loginResult);
  // 4. Validate business logic - email must match the registered value
  TestValidator.equals(
    "login response email matches registered email",
    loginResult.email,
    email,
  );
}
