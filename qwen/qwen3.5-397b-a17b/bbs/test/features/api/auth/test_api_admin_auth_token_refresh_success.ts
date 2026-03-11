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
 * Test successful administrator authentication token refresh workflow.
 *
 * This test validates the complete token refresh cycle for administrators:
 * 1. Creates an admin account and obtains initial authentication tokens
 * 2. Uses the refresh token to obtain a new token pair
 * 3. Validates the new tokens are properly structured and the admin identity is preserved
 */
export async function test_api_admin_auth_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account and obtain initial tokens
  const adminJoinResult: IDiscussionBoardAdmin.IAuthorized =
    await authorize_admin_join(connection, {
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
  typia.assert(adminJoinResult);
  // 2. Extract refresh token from initial authentication
  const originalRefreshToken: string = adminJoinResult.token.refresh;
  const originalRefreshableUntil: string =
    adminJoinResult.token.refreshable_until;
  const adminId: string = adminJoinResult.id;
  // 3. Create new connection for refresh operation (isolated from base connection)
  const refreshConnection: api.IConnection = { host: connection.host };
  // 4. Call refresh endpoint with valid refresh token
  const refreshResult: IDiscussionBoardAdmin.IAuthorized =
    await authorize_admin_refresh(refreshConnection, {
      body: {
        refresh_token: originalRefreshToken,
      } satisfies IDiscussionBoardAdmin.IRefresh,
    });
  typia.assert(refreshResult);
  // 5. Validate business logic - administrator identity preserved across refresh
  TestValidator.equals("admin ID preserved", refreshResult.id, adminId);
  TestValidator.equals(
    "admin grade preserved",
    refreshResult.grade,
    adminJoinResult.grade,
  );
  TestValidator.equals(
    "member ID preserved",
    refreshResult.member.id,
    adminJoinResult.member.id,
  );
  TestValidator.equals(
    "display name preserved",
    refreshResult.member.display_name,
    adminJoinResult.member.display_name,
  );
  // Verify token refresh issued new credentials
  TestValidator.notEquals(
    "new access token issued",
    refreshResult.token.access,
    adminJoinResult.token.access,
  );
  TestValidator.notEquals(
    "new refresh token issued",
    refreshResult.token.refresh,
    originalRefreshToken,
  );
  // Verify refreshable_until timestamp is extended (new session deadline)
  TestValidator.predicate(
    "refreshable_until is in the future",
    new Date(refreshResult.token.refreshable_until).getTime() > Date.now(),
  );
  // Verify admin account remains active (soft delete not applied)
  TestValidator.equals(
    "admin account is active",
    refreshResult.deleted_at,
    null,
  );
}
