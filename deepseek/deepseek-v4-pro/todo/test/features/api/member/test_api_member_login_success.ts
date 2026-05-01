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
 * Verifies that a registered member can authenticate using email and password
 * and receives a complete IAuthorized response containing identity fields,
 * JWT access/refresh tokens, and future expiration timestamps.
 *
 * The test follows the natural authentication flow: first registering a member
 * via the join endpoint with randomized but controlled credentials, then
 * performing a login on an isolated connection. This ensures the login
 * operation is tested independently of the join session.
 *
 * 1. Create a new member via authorize_member_join with controlled email and password.
 * 2. Attempt login on a fresh connection using authorize_member_login with the same credentials.
 * 3. Validate that identity fields (id, email, display_name, created_at) match between join and login.
 * 4. Confirm deleted_at is null for the active account.
 * 5. Verify the token object contains non-empty access and refresh tokens.
 * 6. Validate that expired_at and refreshable_until are future timestamps, and refreshable_until
 *    occurs after expired_at, ensuring correct token lifecycle ordering.
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member via join
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const joinConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(joinConnection, {
    body: { email, password },
  });
  typia.assert(joined);
  // 2. Login with same credentials on fresh connection
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedIn = await authorize_member_login(loginConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.ILogin,
  });
  typia.assert(loggedIn);
  // 3. Validate identity matches between join and login
  TestValidator.equals("member id matches", loggedIn.id, joined.id);
  TestValidator.equals("email matches input", loggedIn.email, email);
  TestValidator.equals(
    "display_name matches",
    loggedIn.display_name,
    joined.display_name,
  );
  TestValidator.equals(
    "created_at matches",
    loggedIn.created_at,
    joined.created_at,
  );
  TestValidator.equals("deleted_at is null", loggedIn.deleted_at, null);
  // 4. Validate token structure
  TestValidator.predicate(
    "access token is non-empty",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    loggedIn.token.refresh.length > 0,
  );
  // 5. Validate future expiration timestamps
  const now = new Date().toISOString();
  TestValidator.predicate(
    "expired_at is in the future",
    loggedIn.token.expired_at > now,
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    loggedIn.token.refreshable_until > now,
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    loggedIn.token.refreshable_until > loggedIn.token.expired_at,
  );
}
