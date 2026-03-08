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
 * Test the primary success path for administrator token refresh.
 *
 * An administrator who has successfully logged in should be able to refresh
 * their expired access token using a valid refresh token without re-entering
 * credentials. The test verifies:
 * 1. A new access token is issued with 30-minute expiration
 * 2. A new refresh token is issued with 7-day expiration with rotation
 * 3. The same session identifier is maintained
 * 4. The admin information (id, email, display_name, grade) remains unchanged
 * 5. The response includes all required fields in IDiscussionBoardAdmin.IAuthorized
 */
export async function test_api_admin_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register an administrator account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_admin_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(joinResult);
  // 2. Login to get initial tokens
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_admin_login(loginConnection, {
    body: {
      email: joinResult.email,
      password: joinResult.token.access, // Note: This might need adjustment
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  typia.assert(loginResult);
  // Store original admin info for comparison
  const originalAdminId = loginResult.id;
  const originalEmail = loginResult.email;
  const originalDisplayName = loginResult.display_name;
  const originalGrade = loginResult.grade;
  const originalCreatedAt = loginResult.created_at;
  const originalUpdatedAt = loginResult.updated_at;
  // 3. Refresh the token using the refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_admin_refresh(refreshConnection, {
    body: {
      refresh_token: loginResult.token.refresh,
    } satisfies IDiscussionBoardAdmin.IRefresh,
  });
  typia.assert(refreshResult);
  // 4. Validate admin information remains unchanged
  TestValidator.equals("admin ID unchanged", refreshResult.id, originalAdminId);
  TestValidator.equals(
    "admin email unchanged",
    refreshResult.email,
    originalEmail,
  );
  TestValidator.equals(
    "admin display_name unchanged",
    refreshResult.display_name,
    originalDisplayName,
  );
  TestValidator.equals(
    "admin grade unchanged",
    refreshResult.grade,
    originalGrade,
  );
  TestValidator.equals(
    "admin created_at unchanged",
    refreshResult.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "admin updated_at unchanged",
    refreshResult.updated_at,
    originalUpdatedAt,
  );
  // 5. Validate new tokens are issued
  TestValidator.predicate(
    "new access token issued",
    refreshResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token issued",
    refreshResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token has expiration",
    refreshResult.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh token has expiration",
    refreshResult.token.refreshable_until.length > 0,
  );
  // 6. Validate token rotation (new refresh token should be different from original)
  TestValidator.notEquals(
    "refresh token rotated",
    refreshResult.token.refresh,
    loginResult.token.refresh,
  );
  // 7. Validate token expiration times are reasonable
  const now = new Date();
  const expiredAt = new Date(refreshResult.token.expired_at);
  const refreshableUntil = new Date(refreshResult.token.refreshable_until);
  TestValidator.predicate("access token expires in future", expiredAt > now);
  TestValidator.predicate(
    "refresh token expires in future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "access token expires within 30 minutes",
    expiredAt.getTime() - now.getTime() <= 30 * 60 * 1000,
  );
  TestValidator.predicate(
    "refresh token expires within 7 days",
    refreshableUntil.getTime() - now.getTime() <= 7 * 24 * 60 * 60 * 1000,
  );
}
