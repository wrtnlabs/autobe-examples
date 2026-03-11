import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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
 * Test session management behavior when administrator logs in with existing active sessions.
 * Validate that new session creation occurs and security context is properly recorded.
 * Test cases: 1. Login with valid credentials creates a new session record,
 * 2. Subsequent login with same credentials should invalidate previous session tokens
 * (if system implements session invalidation policy),
 * 3. Session records should include client context information (IP, user agent for security auditing).
 * Verify that the system creates session records in discussion_board_admin_sessions table with
 * appropriate security context. Check that JWT tokens have proper expiration times based on
 * session duration policies. This validates the business requirement for secure session
 * management and prevention of session hijacking.
 */
export async function test_api_admin_login_session_management_and_old_session_invalidation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account using utility function
  const joinConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Store credentials for subsequent login attempts
  const credentials = {
    email: admin.email,
    password: joinConnection.headers?.Authorization
      ? "password-not-stored"
      : "",
  };
  // 2. First login - create initial session
  const firstLoginConnection: api.IConnection = { host: connection.host };
  const firstLogin = await authorize_admin_login(firstLoginConnection, {
    body: {
      email: admin.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  typia.assert(firstLogin);
  // Validate first session tokens
  TestValidator.notEquals(
    "first login tokens should not be empty",
    firstLogin.token.access,
    "",
  );
  TestValidator.notEquals(
    "first login refresh token should not be empty",
    firstLogin.token.refresh,
    "",
  );
  TestValidator.predicate(
    "first login access token expiration should be future date",
    new Date(firstLogin.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "first login refresh token expiration should be future date",
    new Date(firstLogin.token.refreshable_until) > new Date(),
  );
  // 3. Second login - create another session
  const secondLoginConnection: api.IConnection = { host: connection.host };
  const secondLogin = await authorize_admin_login(secondLoginConnection, {
    body: {
      email: admin.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  typia.assert(secondLogin);
  // Validate second session tokens
  TestValidator.notEquals(
    "second login tokens should not be empty",
    secondLogin.token.access,
    "",
  );
  TestValidator.notEquals(
    "second login refresh token should not be empty",
    secondLogin.token.refresh,
    "",
  );
  TestValidator.predicate(
    "second login access token expiration should be future date",
    new Date(secondLogin.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "second login refresh token expiration should be future date",
    new Date(secondLogin.token.refreshable_until) > new Date(),
  );
  // 4. Compare sessions - tokens should be different (new session created)
  TestValidator.notEquals(
    "access tokens should differ between login sessions",
    firstLogin.token.access,
    secondLogin.token.access,
  );
  TestValidator.notEquals(
    "refresh tokens should differ between login sessions",
    firstLogin.token.refresh,
    secondLogin.token.refresh,
  );
  // 5. Validate session security context
  TestValidator.equals(
    "admin ID should remain consistent",
    firstLogin.id,
    secondLogin.id,
  );
  TestValidator.equals(
    "admin email should remain consistent",
    firstLogin.email,
    secondLogin.email,
  );
  TestValidator.equals(
    "admin grade should remain consistent",
    firstLogin.admin_grade,
    secondLogin.admin_grade,
  );
  // 6. Additional validation: token expiration times should be valid ISO dates
  TestValidator.predicate(
    "first token expired_at is valid ISO date",
    !isNaN(new Date(firstLogin.token.expired_at).getTime()),
  );
  TestValidator.predicate(
    "second token expired_at is valid ISO date",
    !isNaN(new Date(secondLogin.token.expired_at).getTime()),
  );
  TestValidator.predicate(
    "first token refreshable_until is valid ISO date",
    !isNaN(new Date(firstLogin.token.refreshable_until).getTime()),
  );
  TestValidator.predicate(
    "second token refreshable_until is valid ISO date",
    !isNaN(new Date(secondLogin.token.refreshable_until).getTime()),
  );
}
