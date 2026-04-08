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
 * Validates the complete member authentication flow including account registration and login. Ensures that a newly registered member can successfully authenticate with their credentials and receive valid authorization tokens.
 *
 * Special attention is given to verifying that the login response contains valid member identity information and properly structured authorization tokens with future expiration times.
 *
 * 1. Register a new member account with unique email, password, and session context.
 * 2. Login with the same credentials used during registration.
 * 3. Validate the response contains member identity (id, email, display_name, timestamps).
 * 4. Verify authorization tokens are present and properly structured.
 * 5. Confirm the account is active (deleted_at is null).
 * 6. Validate token expiration times are in the future.
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const joined = await authorize_member_join(joinConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joined);
  // 2. Login with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.ILogin,
  });
  typia.assert(loginResult);
  // 3. Validate member identity matches
  TestValidator.equals("member id consistent", loginResult.id, joined.id);
  TestValidator.equals(
    "email matches registration",
    loginResult.email,
    joinEmail,
  );
  // 4. Verify account is active (not deleted)
  TestValidator.equals("account is active", loginResult.deleted_at, null);
  // 5. Validate token expiration times are in the future
  const now = new Date();
  const expiredAt = new Date(loginResult.token.expired_at);
  const refreshableUntil = new Date(loginResult.token.refreshable_until);
  TestValidator.predicate("access token not expired", expiredAt > now);
  TestValidator.predicate("refresh token valid", refreshableUntil > now);
  TestValidator.predicate(
    "refresh deadline after access expiry",
    refreshableUntil > expiredAt,
  );
}
