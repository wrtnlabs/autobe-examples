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

export async function test_api_guest_refresh_token_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest account to obtain initial tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const original = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  typia.assert(original);
  // Store original identity information for comparison
  const originalId = original.id;
  const originalEmail = original.email;
  const originalCreatedAt = original.created_at;
  const originalExpiredAt = original.token.expired_at;
  const originalRefreshableUntil = original.token.refreshable_until;
  // 2. Use refresh token to extend session
  const refreshed = await authorize_guest_refresh(guestConnection, {
    body: {
      refresh_token: original.token.refresh,
    } satisfies IMultiUserTodoGuest.IRefresh,
  });
  typia.assert(refreshed);
  // 3. Verify identity consistency
  TestValidator.equals("guest id remains same", refreshed.id, originalId);
  TestValidator.equals(
    "guest email remains same",
    refreshed.email,
    originalEmail,
  );
  TestValidator.equals(
    "created_at remains same",
    refreshed.created_at,
    originalCreatedAt,
  );
  // 4. Verify tokens are updated (new expiration should be later)
  TestValidator.predicate(
    "new access token expires later",
    new Date(refreshed.token.expired_at) > new Date(originalExpiredAt),
  );
  TestValidator.predicate(
    "new refreshable_until is later",
    new Date(refreshed.token.refreshable_until) >
      new Date(originalRefreshableUntil),
  );
  // 5. Verify new tokens are different from original
  TestValidator.notEquals(
    "new access token differs",
    refreshed.token.access,
    original.token.access,
  );
  TestValidator.notEquals(
    "new refresh token differs",
    refreshed.token.refresh,
    original.token.refresh,
  );
  // 6. Validate new access token can be used for authenticated operations
  // Create a new connection with the refreshed token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: refreshed.token.access },
  };
  // Make a simple authenticated call to verify token works
  // Since we don't have other guest endpoints, we'll validate the token structure
  TestValidator.predicate(
    "access token is non-empty",
    refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    refreshed.token.refresh.length > 0,
  );
}
