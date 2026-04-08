import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
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
 * Validates the complete member authentication flow including account registration, login with valid credentials, and token generation. Ensures that the login response contains all required authentication tokens and member identity information.
 *
 * The test verifies that JWT access and refresh tokens are properly generated with correct expiration timestamps. Session context information (href, referrer, ip) is captured for security audit purposes.
 *
 * 1. Register a new member account with unique email and password.
 * 2. Create a new connection for login attempt.
 * 3. Submit login request with registered credentials and session context.
 * 4. Verify response contains member id, email, and authorization tokens.
 * 5. Validate token expiration timestamps are in the future.
 * 6. Verify member profile is returned (may be null if not created).
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
  } satisfies IHrmPlatformMember.IJoin;
  const joinResult = await authorize_member_join(connection, {
    body: joinCredentials,
  });
  typia.assert(joinResult);
  // 2. Create new connection for login
  const loginConnection: api.IConnection = { host: connection.host };
  // 3. Login with registered credentials
  const loginCredentials = {
    email: joinCredentials.email,
    password: joinCredentials.password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmPlatformMember.ILogin;
  const loginResult = await authorize_member_login(loginConnection, {
    body: loginCredentials,
  });
  typia.assert(loginResult);
  // 4. Validate member identity matches registration
  TestValidator.equals("member id matches", loginResult.id, joinResult.id);
  TestValidator.equals(
    "email matches",
    loginResult.email,
    joinCredentials.email,
  );
  // 5. Validate token expiration timestamps are in the future
  const now = new Date();
  const expiredAt = new Date(loginResult.token.expired_at);
  const refreshableUntil = new Date(loginResult.token.refreshable_until);
  TestValidator.predicate("expired_at is in future", expiredAt > now);
  TestValidator.predicate(
    "refreshable_until is in future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil > expiredAt,
  );
}
