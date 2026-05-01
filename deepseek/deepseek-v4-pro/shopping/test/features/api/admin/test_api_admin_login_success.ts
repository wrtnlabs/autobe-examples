import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test successful administrator login with valid credentials.
 *
 * Validates the complete administrator authentication flow: registration
 * followed by login with the same credentials. Verifies the login endpoint
 * returns proper JWT token pairs with correct expiration semantics and
 * administrator identity fields.
 *
 * 1. Register a new administrator using authorize_admin_join with generated
 *    email and password.
 * 2. Login with the same credentials using authorize_admin_login with session
 *    context (href, referrer).
 * 3. Validate token pair: non-empty access and refresh tokens, expired_at in
 *    the future, refreshable_until further than expired_at.
 * 4. Validate identity: email matches registration, grade is 'regular', id
 *    matches across join and login, timestamps present.
 * 5. Verify Authorization header is set on the connection for subsequent
 *    authenticated requests.
 */
export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // 2. Register admin
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_admin_join(joinConnection, {
    body: { email, password },
  });
  typia.assert(joinResult);
  // 3. Login with same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_admin_login(loginConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(loginResult);
  // 4. Validate token pair
  TestValidator.predicate(
    "access token non-empty",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token non-empty",
    loginResult.token.refresh.length > 0,
  );
  const now = new Date();
  const expiredAt = new Date(loginResult.token.expired_at);
  const refreshableUntil = new Date(loginResult.token.refreshable_until);
  TestValidator.predicate("expired_at in future", expiredAt > now);
  TestValidator.predicate(
    "refreshable_until further than expired_at",
    refreshableUntil > expiredAt,
  );
  // 5. Validate identity fields
  TestValidator.equals("email matches registration", loginResult.email, email);
  TestValidator.equals("grade is regular", loginResult.grade, "regular");
  TestValidator.equals(
    "id matches across join and login",
    joinResult.id,
    loginResult.id,
  );
  TestValidator.predicate(
    "created_at is valid timestamp",
    !isNaN(new Date(loginResult.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    !isNaN(new Date(loginResult.updated_at).getTime()),
  );
  // 6. Verify Authorization header for subsequent requests
  TestValidator.predicate(
    "Authorization header matches access token",
    loginConnection.headers?.Authorization === loginResult.token.access,
  );
}
