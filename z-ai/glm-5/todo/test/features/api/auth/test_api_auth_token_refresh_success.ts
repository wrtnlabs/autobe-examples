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

export async function test_api_auth_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member and obtain initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const initialAuth: ITodoAppMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {},
  );
  typia.assert(initialAuth);
  // Store original tokens for comparison
  const originalAccessToken = initialAuth.token.access;
  const originalRefreshToken = initialAuth.token.refresh;
  const originalRefreshableUntil = initialAuth.token.refreshable_until;
  // Step 2: Call refresh with the valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth: ITodoAppMember.IAuthorized =
    await authorize_member_refresh(refreshConnection, {
      body: {
        refreshToken: originalRefreshToken,
      } satisfies ITodoAppMember.IRefresh,
    });
  typia.assert(refreshedAuth);
  // Step 3: Verify member profile is consistent
  TestValidator.equals("member id matches", refreshedAuth.id, initialAuth.id);
  TestValidator.equals("email matches", refreshedAuth.email, initialAuth.email);
  TestValidator.equals(
    "displayName matches",
    refreshedAuth.displayName,
    initialAuth.displayName,
  );
  // Step 4: Verify new tokens are different from original (token rotation)
  TestValidator.notEquals(
    "access token rotated",
    refreshedAuth.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshedAuth.token.refresh,
    originalRefreshToken,
  );
  // Step 5: Verify expired_at is in the future
  const now = new Date();
  const newExpiredAt = new Date(refreshedAuth.token.expired_at);
  TestValidator.predicate(
    "new access token expires in the future",
    newExpiredAt > now,
  );
  // Step 6: Verify refreshable_until is preserved (session max lifetime)
  TestValidator.equals(
    "refreshable_until preserved",
    refreshedAuth.token.refreshable_until,
    originalRefreshableUntil,
  );
  // Step 7: Verify old refresh token is invalidated
  await TestValidator.error("old refresh token invalidated", async () => {
    await api.functional.todoApp.auth.member.refresh(connection, {
      body: {
        refreshToken: originalRefreshToken,
      } satisfies ITodoAppMember.IRefresh,
    });
  });
}
