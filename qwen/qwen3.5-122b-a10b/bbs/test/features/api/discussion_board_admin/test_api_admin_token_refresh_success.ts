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
 * Test administrator token refresh success workflow.
 * 1. Admin joins the system to obtain initial authentication tokens
 * 2. Admin uses valid refresh token to request new tokens
 * 3. Verify new access token is generated with proper expiration
 * 4. Validate response includes complete admin profile and token information
 */
export async function test_api_admin_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins the system to obtain initial tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      grade: RandomGenerator.pick(["regular", "super"]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(joinResult);
  // Store original admin ID for validation
  const originalAdminId = joinResult.id;
  const originalRefreshToken = joinResult.token.refresh;
  // 2. Admin refreshes tokens using valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_admin_refresh(refreshConnection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies IDiscussionBoardAdmin.IRefresh,
  });
  typia.assert(refreshResult);
  // 3. Validate response structure and content
  TestValidator.equals("admin ID preserved", refreshResult.id, originalAdminId);
  TestValidator.equals(
    "display name matches",
    refreshResult.display_name,
    joinResult.display_name,
  );
  TestValidator.equals("email matches", refreshResult.email, joinResult.email);
  TestValidator.equals("grade matches", refreshResult.grade, joinResult.grade);
  TestValidator.equals("bio matches", refreshResult.bio, joinResult.bio);
  // 4. Validate token structure
  TestValidator.predicate(
    "has access token",
    refreshResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    refreshResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has expired_at timestamp",
    refreshResult.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "has refreshable_until timestamp",
    refreshResult.token.refreshable_until !== undefined,
  );
  // 5. Verify new tokens are different from original (token rotation)
  TestValidator.notEquals(
    "access token is new",
    refreshResult.token.access,
    joinResult.token.access,
  );
}
