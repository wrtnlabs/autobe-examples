import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test token refresh operation maintains session context and extends session lifetime.
 *
 * Validates that the member refresh endpoint correctly extends the authentication session while preserving member identity. The test verifies that refreshed tokens have extended expiration times and that all member profile data remains consistent across refresh operations.
 *
 * Special attention is given to ensuring that the session extension mechanism works correctly, with the new expired_at timestamp being later than the original, and that the refreshable_until deadline properly represents the absolute session expiration boundary.
 *
 * 1. Register a new member account to obtain initial authentication tokens.
 * 2. Extract the refresh token and initial expired_at timestamp from the join response.
 * 3. Create a new connection for the refresh operation following connection isolation pattern.
 * 4. Call the refresh endpoint with the refresh token.
 * 5. Validate that the new expired_at is later than the original expired_at.
 * 6. Confirm member identity (id, email) remains consistent across operations.
 * 7. Verify all required fields are present in both responses.
 */
export async function test_api_member_refresh_with_valid_session_context(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member to create initial session
  const memberConnection: api.IConnection = { host: connection.host };
  const initialAuth: ITodoAppMember.IAuthorized =
    await api.functional.todoApp.auth.member.join(memberConnection, {
      body: typia.random<ITodoAppMember.IJoin>(),
    });
  typia.assert(initialAuth);
  // 2. Extract refresh token and initial timestamps
  const refreshToken: string = initialAuth.token.refresh;
  const initialExpiredAt: Date = new Date(initialAuth.token.expired_at);
  const initialMemberId: string = initialAuth.id;
  const initialEmail: string = initialAuth.email;
  // 3. Create new connection for refresh operation (connection isolation)
  const refreshConnection: api.IConnection = { host: connection.host };
  // 4. Call refresh endpoint with the refresh token
  const refreshedAuth: ITodoAppMember.IAuthorized =
    await api.functional.todoApp.auth.member.refresh(refreshConnection, {
      body: {
        refreshToken,
      } satisfies ITodoAppMember.IRefresh,
    });
  typia.assert(refreshedAuth);
  // 5. Validate that new expired_at is later than original (session extended)
  const refreshedExpiredAt: Date = new Date(refreshedAuth.token.expired_at);
  TestValidator.predicate(
    "session extended - new expired_at is later than initial",
    refreshedExpiredAt.getTime() > initialExpiredAt.getTime(),
  );
  // 6. Confirm member identity remains consistent across refresh
  TestValidator.equals(
    "member id unchanged",
    refreshedAuth.id,
    initialMemberId,
  );
  TestValidator.equals(
    "member email unchanged",
    refreshedAuth.email,
    initialEmail,
  );
  // 7. Validate refreshable_until represents absolute session expiration deadline
  TestValidator.predicate(
    "refreshable_until is in the future",
    new Date(refreshedAuth.token.refreshable_until).getTime() > Date.now(),
  );
  // 8. Verify that new access and refresh tokens are different (token rotation)
  TestValidator.notEquals(
    "access token refreshed",
    refreshedAuth.token.access,
    initialAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token refreshed",
    refreshedAuth.token.refresh,
    initialAuth.token.refresh,
  );
}
