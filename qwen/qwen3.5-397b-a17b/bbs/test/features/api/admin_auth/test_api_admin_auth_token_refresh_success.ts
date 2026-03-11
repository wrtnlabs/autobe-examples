import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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
 * Test administrator token refresh success path.
 *
 * Validates that administrators can successfully refresh their authentication
 * tokens using a valid refresh token. The test creates an admin account,
 * obtains initial tokens, then refreshes them and validates token rotation
 * and session extension.
 */
export async function test_api_admin_auth_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account and obtain initial tokens
  const joinResult = await authorize_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(joinResult);
  // 2. Extract initial tokens
  const initialAccessToken = joinResult.token.access;
  const initialRefreshToken = joinResult.token.refresh;
  const adminId = joinResult.id;
  const adminGrade = joinResult.grade;
  const memberId = joinResult.member.id;
  // 3. Create new connection for refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // 4. Refresh tokens using the refresh token
  const refreshResult = await authorize_admin_refresh(refreshConnection, {
    body: {
      refresh_token: initialRefreshToken,
    } satisfies IDiscussionBoardAdmin.IRefresh,
  });
  typia.assert(refreshResult);
  // 5. Validate token rotation - new access token
  TestValidator.notEquals(
    "access token rotated",
    initialAccessToken,
    refreshResult.token.access,
  );
  // 6. Validate token rotation - new refresh token
  TestValidator.notEquals(
    "refresh token rotated",
    initialRefreshToken,
    refreshResult.token.refresh,
  );
  // 7. Validate expired_at is in the future
  const expiredAt = new Date(refreshResult.token.expired_at);
  const now = new Date();
  TestValidator.predicate("expired_at is in future", expiredAt > now);
  // 8. Validate refreshable_until is in the future
  const refreshableUntil = new Date(refreshResult.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is in future",
    refreshableUntil > now,
  );
  // 9. Validate refreshable_until extends beyond expired_at
  TestValidator.predicate(
    "refreshable_until extends session",
    refreshableUntil >= expiredAt,
  );
  // 10. Validate administrator ID preserved
  TestValidator.equals("admin id preserved", adminId, refreshResult.id);
  // 11. Validate administrator grade preserved
  TestValidator.equals(
    "admin grade preserved",
    adminGrade,
    refreshResult.grade,
  );
  // 12. Validate member ID preserved
  TestValidator.equals(
    "member id preserved",
    memberId,
    refreshResult.member.id,
  );
  // 13. Validate member status remains active
  TestValidator.equals(
    "member status is active",
    refreshResult.member.status,
    "active",
  );
}
