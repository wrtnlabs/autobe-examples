import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
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
 * Validates the complete administrator authentication flow including account creation, login with valid credentials, and JWT token generation. Ensures that the system properly authenticates administrators and returns all required authorization data including access tokens, refresh tokens, and account information.
 *
 * The test verifies that login credentials created during admin join operation can be used successfully for authentication. Special attention is given to validating the token structure, expiration timestamps, and administrator profile data returned in the authorization response.
 *
 * 1. Administrator account is created with unique email, password, and grade level.
 * 2. Login request is submitted with matching credentials and session context (href, referrer, ip).
 * 3. Response is validated to contain IShoppingMallAdmin.IAuthorized with valid tokens and complete admin profile.
 * 4. Token expiration timestamps are verified to be properly formatted date-time strings.
 * 5. Administrator grade and member information are validated against the original join data.
 */
export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account
  const joinCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    grade: RandomGenerator.pick(["regular", "super"] as const),
  } satisfies IShoppingMallAdmin.IJoin;
  const joinResult = await authorize_admin_join(connection, {
    body: joinCredentials,
  });
  typia.assert(joinResult);
  // 2. Login with the created credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_admin_login(loginConnection, {
    body: {
      email: joinCredentials.email,
      password: joinCredentials.password,
      href: "https://example.com/admin/login",
      referrer: "https://example.com/admin",
      ip: "192.168.1.1",
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(loginResult);
  // 3. Validate login response structure
  TestValidator.equals("admin id matches", loginResult.id, joinResult.id);
  TestValidator.equals(
    "email matches",
    loginResult.email,
    joinCredentials.email,
  );
  TestValidator.equals(
    "grade matches",
    loginResult.grade,
    joinCredentials.grade,
  );
  TestValidator.predicate(
    "has valid access token",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "has valid refresh token",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is in the future",
    new Date(loginResult.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    new Date(loginResult.token.refreshable_until) > new Date(),
  );
  TestValidator.predicate("member exists", loginResult.member !== null);
  TestValidator.predicate(
    "bannedAt is null for active admin",
    loginResult.bannedAt === null,
  );
  TestValidator.predicate(
    "deletedAt is null for active admin",
    loginResult.deletedAt === null,
  );
}
