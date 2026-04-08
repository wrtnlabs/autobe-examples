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
 * Test token refresh operation fails when the session has expired or refresh token is invalid.
 *
 * Validates that the token refresh endpoint properly rejects invalid or expired refresh tokens with appropriate error responses. This ensures that expired sessions cannot be used to obtain new access tokens, maintaining security boundaries.
 *
 * Since E2E tests cannot manipulate time to create genuinely expired sessions, this test uses an invalid refresh token to exercise the same validation path. Both expired and invalid tokens should result in 401 Unauthorized responses, confirming the session validation logic is functioning correctly.
 *
 * 1. Register a new member account and obtain valid refresh token.
 * 2. Attempt to refresh with an invalid/fake refresh token.
 * 3. Verify the operation throws HTTP 401 Unauthorized error.
 * 4. Confirms system rejects invalid/expired tokens and requires re-authentication.
 */
export async function test_api_member_token_refresh_expired_session(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member to get valid credentials
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Test with invalid refresh token (simulates expired session)
  // In E2E testing, we cannot wait for real-time expiration.
  // Using invalid token exercises same validation path as expired token.
  const invalidRefreshToken = typia.random<string>();
  await TestValidator.httpError(
    "refresh with invalid token should return 401",
    401,
    async () => {
      await api.functional.hrmPlatform.auth.member.refresh(memberConnection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies IHrmPlatformMember.IRefresh,
      });
    },
  );
}
