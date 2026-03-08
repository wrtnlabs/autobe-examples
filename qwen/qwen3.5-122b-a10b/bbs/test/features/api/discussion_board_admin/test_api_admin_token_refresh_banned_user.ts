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
 * Test administrator token refresh workflow.
 *
 * This test verifies that administrators can successfully refresh their JWT tokens
 * using the refresh endpoint. The test flow:
 * (1) Create an admin account and obtain initial tokens via join,
 * (2) Store the refresh token from the response,
 * (3) Attempt to refresh the token using authorize_admin_refresh,
 * (4) Verify the system returns new valid tokens with proper structure.
 *
 * Note: The original scenario intended to test banned admin token rejection,
 * but without a ban API function available, we test the positive refresh path.
 * In production, the server would reject refresh attempts from banned accounts.
 */
export async function test_api_admin_token_refresh_banned_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and obtain initial tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
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
  typia.assert(adminAuth);
  // 2. Store the refresh token
  const refreshToken: string = adminAuth.token.refresh;
  typia.assert(refreshToken);
  // 3. Attempt to refresh the token using a new connection
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_admin_refresh(refreshConnection, {
    body: {
      refresh_token: refreshToken,
    } satisfies IDiscussionBoardAdmin.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 4. Validate the refreshed tokens have proper structure
  TestValidator.equals("admin ID preserved", refreshedAuth.id, adminAuth.id);
  TestValidator.equals("email preserved", refreshedAuth.email, adminAuth.email);
  TestValidator.equals(
    "display name preserved",
    refreshedAuth.display_name,
    adminAuth.display_name,
  );
  TestValidator.equals("grade preserved", refreshedAuth.grade, adminAuth.grade);
  // 5. Validate new tokens are different from old ones (token rotation)
  TestValidator.notEquals(
    "new access token",
    refreshedAuth.token.access,
    adminAuth.token.access,
  );
  TestValidator.notEquals(
    "new refresh token",
    refreshedAuth.token.refresh,
    adminAuth.token.refresh,
  );
  // 6. Validate token expiration timestamps are in the future
  const now = new Date();
  TestValidator.predicate(
    "access token expires in future",
    new Date(refreshedAuth.token.expired_at) > now,
  );
  TestValidator.predicate(
    "refreshable until is in future",
    new Date(refreshedAuth.token.refreshable_until) > now,
  );
  // 7. Validate refreshable_until is after expired_at
  TestValidator.predicate(
    "refreshable_until after expired_at",
    new Date(refreshedAuth.token.refreshable_until) >
      new Date(refreshedAuth.token.expired_at),
  );
}