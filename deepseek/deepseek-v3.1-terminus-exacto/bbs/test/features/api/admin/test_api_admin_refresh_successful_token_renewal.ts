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
 * Test successful token refresh scenario where an administrator uses a valid refresh token
 * to obtain new access and refresh tokens. Validate that the system properly authenticates
 * the refresh token, generates new tokens with updated expiration times, maintains session
 * continuity, and returns the administrator's identity information along with the new tokens.
 */
export async function test_api_admin_refresh_successful_token_renewal(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create administrator account and obtain initial tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(initialAuth);
  // Step 2: Use refresh token to obtain new tokens
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_admin_refresh(refreshConnection, {
    body: {
      refresh_token: initialAuth.token.refresh,
    } satisfies IDiscussionBoardAdmin.IRefresh,
  });
  typia.assert(refreshedAuth);
  // Step 3: Validate session continuity and token renewal
  TestValidator.equals(
    "admin ID should remain the same",
    refreshedAuth.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "admin email should remain the same",
    refreshedAuth.email,
    initialAuth.email,
  );
  TestValidator.equals(
    "admin grade should remain the same",
    refreshedAuth.admin_grade,
    initialAuth.admin_grade,
  );
  // Step 4: Validate that tokens are actually renewed (business logic)
  TestValidator.notEquals(
    "access token should be renewed",
    refreshedAuth.token.access,
    initialAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be renewed",
    refreshedAuth.token.refresh,
    initialAuth.token.refresh,
  );
  TestValidator.notEquals(
    "expiration time should be updated",
    refreshedAuth.token.expired_at,
    initialAuth.token.expired_at,
  );
  TestValidator.notEquals(
    "refreshable until should be updated",
    refreshedAuth.token.refreshable_until,
    initialAuth.token.refreshable_until,
  );
  // Step 5: Verify token rotation mechanism by attempting to reuse old refresh token
  await TestValidator.error(
    "old refresh token should be invalidated",
    async () => {
      const invalidConnection: api.IConnection = { host: connection.host };
      await authorize_admin_refresh(invalidConnection, {
        body: {
          refresh_token: initialAuth.token.refresh,
        } satisfies IDiscussionBoardAdmin.IRefresh,
      });
    },
  );
}
