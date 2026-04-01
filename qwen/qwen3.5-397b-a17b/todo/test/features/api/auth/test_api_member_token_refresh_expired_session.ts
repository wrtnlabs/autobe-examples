import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test token refresh failure when the session has expired.
 *
 * Since the API does not provide session expiration control, this test validates:
 * 1. The refresh mechanism with valid tokens
 * 2. Error handling for invalid refresh tokens (401 Unauthorized)
 *
 * Note: Actual session expiration testing requires session state manipulation APIs
 * that are not available in the current API set. This test verifies the refresh
 * endpoint's error handling behavior with invalid tokens as a proxy for expired
 * session validation.
 *
 * Workflow:
 * 1. Register a new member account to obtain valid refresh token
 * 2. Attempt token refresh with the obtained refresh token (should succeed)
 * 3. Validate the response structure and token format
 * 4. Test error handling by attempting refresh with invalid refresh token (should fail with 401)
 */
export async function test_api_member_token_refresh_expired_session(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member to obtain valid refresh token
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(joinResult);
  // Step 2: Attempt token refresh with the valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh_token: joinResult.token.refresh,
    } satisfies IMultiUserTodoMember.IRefresh,
  });
  typia.assert(refreshResult);
  // Verify member ID remains the same after refresh
  TestValidator.equals(
    "member id unchanged after refresh",
    joinResult.id,
    refreshResult.id,
  );
  // Verify tokens are different after refresh (token rotation)
  TestValidator.notEquals(
    "access token rotated",
    joinResult.token.access,
    refreshResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    joinResult.token.refresh,
    refreshResult.token.refresh,
  );
  // Step 3: Test error handling with invalid refresh token (simulates expired session behavior)
  // Using a fake/invalid refresh token to trigger 401 Unauthorized response
  await TestValidator.error("refresh fails with invalid token", async () => {
    const invalidRefreshConnection: api.IConnection = { host: connection.host };
    await authorize_member_refresh(invalidRefreshConnection, {
      body: {
        refresh_token:
          "invalid_refresh_token_" + RandomGenerator.alphaNumeric(32),
      } satisfies IMultiUserTodoMember.IRefresh,
    });
  });
}
