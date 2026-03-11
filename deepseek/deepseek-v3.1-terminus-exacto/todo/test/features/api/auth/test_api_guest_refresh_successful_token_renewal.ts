import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_successful_token_renewal(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create guest account and obtain initial tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  typia.assert(initialAuth);
  // Step 2: Extract refresh token from initial authorization
  const refreshToken = initialAuth.token.refresh;
  // Step 3: Create new connection for refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // Step 4: Call refresh endpoint with the obtained refresh token
  const refreshedAuth = await authorize_guest_refresh(refreshConnection, {
    body: {
      refresh_token: refreshToken,
    } satisfies IMultiUserTodoGuest.IRefresh,
  });
  typia.assert(refreshedAuth);
  // Step 5: Validate guest account information remains consistent
  TestValidator.equals(
    "guest id should remain the same",
    refreshedAuth.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "guest email should remain the same",
    refreshedAuth.email,
    initialAuth.email,
  );
  TestValidator.equals(
    "guest created_at should remain the same",
    refreshedAuth.created_at,
    initialAuth.created_at,
  );
  TestValidator.equals(
    "guest updated_at should remain the same",
    refreshedAuth.updated_at,
    initialAuth.updated_at,
  );
  // Step 6: Validate that new tokens are issued
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
  // Step 7: Validate token expiration timestamps are updated
  TestValidator.notEquals(
    "expired_at should be updated",
    refreshedAuth.token.expired_at,
    initialAuth.token.expired_at,
  );
  TestValidator.notEquals(
    "refreshable_until should be updated",
    refreshedAuth.token.refreshable_until,
    initialAuth.token.refreshable_until,
  );
  // Step 8: Validate that new expiration timestamps are in the future
  const now = new Date();
  const newExpiredAt = new Date(refreshedAuth.token.expired_at);
  const newRefreshableUntil = new Date(refreshedAuth.token.refreshable_until);
  TestValidator.predicate(
    "new expired_at should be in the future",
    newExpiredAt > now,
  );
  TestValidator.predicate(
    "new refreshable_until should be in the future",
    newRefreshableUntil > now,
  );
}
