import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new member account and obtain initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const initialAuth: IPrivateTodoAppMember.IAuthorized =
    await authorize_member_join(memberConnection, {});
  // Validate initial authorization response
  typia.assert(initialAuth);
  // Store original tokens for comparison
  const originalAccessToken: string = initialAuth.token.access;
  const originalRefreshToken: string = initialAuth.token.refresh;
  // Step 2: Call refresh endpoint with the refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth: IPrivateTodoAppMember.IAuthorized =
    await authorize_member_refresh(refreshConnection, {
      body: {
        refresh_token: originalRefreshToken,
      } satisfies IPrivateTodoAppMember.IRefresh,
    });
  // Validate refresh response
  typia.assert(refreshedAuth);
  // Step 3: Verify new tokens are different (rotation pattern)
  TestValidator.notEquals(
    "new access token should be different from original",
    refreshedAuth.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token should be different from original (rotation)",
    refreshedAuth.token.refresh,
    originalRefreshToken,
  );
  // Step 4: Verify member data matches the registered member
  TestValidator.equals(
    "member id should match",
    refreshedAuth.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "member email should match",
    refreshedAuth.email,
    initialAuth.email,
  );
  // Step 5: Verify expiration timestamps are in the future
  const now: Date = new Date();
  const expiredAt: Date = new Date(refreshedAuth.token.expired_at);
  const refreshableUntil: Date = new Date(
    refreshedAuth.token.refreshable_until,
  );
  TestValidator.predicate(
    "expired_at should be in the future",
    expiredAt > now,
  );
  TestValidator.predicate(
    "refreshable_until should be in the future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refreshable_until should be later than expired_at",
    refreshableUntil > expiredAt,
  );
  // Step 6: Verify member account status (deleted_at should be null)
  TestValidator.equals(
    "deleted_at should be null for active account",
    refreshedAuth.deletedAt,
    null,
  );
}
