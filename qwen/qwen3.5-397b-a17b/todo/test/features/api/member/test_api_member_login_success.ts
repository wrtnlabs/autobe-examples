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
 * Test successful member authentication with valid email and password credentials.
 *
 * This test validates the complete member login workflow:
 * 1. Register a new member account with unique email and password
 * 2. Attempt login with the same credentials
 * 3. Validate the response contains all required member identity fields
 * 4. Validate the authorization token structure (access, refresh, expired_at, refreshable_until)
 * 5. Verify the access token is properly set in the connection for subsequent requests
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new member account for testing
  const joinCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoAppMember.IJoin;
  // Register the member account
  const joinResult = await authorize_member_join(connection, {
    body: joinCredentials,
  });
  typia.assert(joinResult);
  // Step 2: Create a new connection for login test
  const loginConnection: api.IConnection = { host: connection.host };
  // Step 3: Attempt login with the registered credentials
  const loginCredentials = {
    email: joinCredentials.email,
    password: joinCredentials.password,
  } satisfies ITodoAppMember.ILogin;
  const loginResult = await authorize_member_login(loginConnection, {
    body: loginCredentials,
  });
  typia.assert(loginResult);
  // Step 4: Validate member identity information
  TestValidator.equals("member id matches", loginResult.id, joinResult.id);
  TestValidator.equals(
    "email matches",
    loginResult.email,
    joinCredentials.email,
  );
  TestValidator.equals(
    "display name matches",
    loginResult.display_name,
    joinCredentials.display_name,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    loginResult.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    loginResult.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null for active account",
    loginResult.deleted_at,
    null,
  );
  // Step 5: Validate authorization token structure
  TestValidator.predicate(
    "access token exists",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    loginResult.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    loginResult.token.refreshable_until.length > 0,
  );
  // Step 6: Validate connection was updated with access token
  TestValidator.predicate(
    "connection has authorization header",
    loginConnection.headers?.Authorization !== undefined,
  );
  TestValidator.equals(
    "authorization header matches access token",
    loginConnection.headers?.Authorization,
    loginResult.token.access,
  );
}
