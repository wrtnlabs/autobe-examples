import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test successful administrator login with correct credentials.
 *
 * 1. Create an admin account via the join endpoint using random credentials
 * 2. Attempt to login with the same email and password
 * 3. Verify the response contains valid authorization tokens with expiration timestamps
 * 4. Confirm admin ID and email match the created account
 * 5. Validate token expiration timestamps are in the future
 */
export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for admin operations
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 1: Create admin account with random credentials
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformAdmin.IJoin;
  const joinResponse = await authorize_admin_join(adminConnection, {
    body: joinBody,
  });
  typia.assert(joinResponse);
  // Store the admin credentials for login
  const loginCredentials = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies ICommunityPlatformAdmin.ILogin;
  // Step 2: Login with the created credentials
  const loginResponse = await authorize_admin_login(adminConnection, {
    body: loginCredentials,
  });
  typia.assert(loginResponse);
  // Step 3: Validate response structure matches IAuthorized schema
  TestValidator.equals(
    "admin ID should match join response",
    loginResponse.id,
    joinResponse.id,
  );
  TestValidator.equals(
    "admin email should match join credentials",
    loginResponse.email,
    joinBody.email,
  );
  // Step 4: Validate token structure
  const token = loginResponse.token;
  typia.assert<IAuthorizationToken>(token);
  TestValidator.predicate(
    "access token should be present",
    token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be present",
    token.refresh.length > 0,
  );
  // Step 5: Validate expiration timestamps
  const expiredAt = new Date(token.expired_at);
  const refreshableUntil = new Date(token.refreshable_until);
  const now = new Date();
  TestValidator.predicate(
    "access token expiration should be in the future",
    expiredAt > now,
  );
  TestValidator.predicate(
    "refresh token expiration should be in the future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refresh token expiration should be later than access token expiration",
    refreshableUntil > expiredAt,
  );
  // Step 6: Verify connection headers were updated with access token
  TestValidator.predicate(
    "connection should have Authorization header set",
    adminConnection.headers?.Authorization === token.access,
  );
}
