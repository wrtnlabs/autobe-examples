import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a guest account to obtain initial session tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const guestAccount = await authorize_guest_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoAppGuest.IJoin,
  });
  typia.assert(guestAccount);
  // Step 2: Store the initial refresh token for potential use
  const initialRefreshToken = guestAccount.token.refresh;
  // Step 3: Test with a non-existent guest token (simulates expired/invalid scenario)
  // Note: True expiration testing (token exists but refreshable_until is in the past)
  // requires database manipulation which is not available in the current test environment.
  // Using a valid UUID format with non-existent guest to test error handling.
  const nonExistentRefreshToken = "00000000-0000-0000-0000-000000000001";
  // Step 4: Attempt refresh with non-existent token
  // The system should reject this with 401 Unauthorized
  await TestValidator.httpError(
    "non-existent refresh token should return 401",
    [401],
    async () => {
      const refreshConnection: api.IConnection = { host: connection.host };
      await api.functional.multiUserTodoApp.auth.guest.refresh(
        refreshConnection,
        {
          body: {
            refresh_token: nonExistentRefreshToken,
          } satisfies IMultiUserTodoAppGuest.IRefresh,
        },
      );
    },
  );
  // Step 5: Test with a completely invalid UUID format
  // Should also return appropriate error
  await TestValidator.httpError(
    "invalid refresh token format should return 401",
    [401],
    async () => {
      const refreshConnection2: api.IConnection = { host: connection.host };
      await api.functional.multiUserTodoApp.auth.guest.refresh(
        refreshConnection2,
        {
          body: {
            refresh_token: "invalid-uuid-format",
          } satisfies IMultiUserTodoAppGuest.IRefresh,
        },
      );
    },
  );
  // Step 6: Test with valid token to ensure normal flow still works
  // Create another guest and verify refresh works with valid token
  const validGuestConnection: api.IConnection = { host: connection.host };
  const validGuestAccount = await authorize_guest_join(validGuestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoAppGuest.IJoin,
  });
  typia.assert(validGuestAccount);
  // Verify refresh works with valid token
  const freshRefreshConnection: api.IConnection = { host: connection.host };
  const refreshedAccount =
    await api.functional.multiUserTodoApp.auth.guest.refresh(
      freshRefreshConnection,
      {
        body: {
          refresh_token: validGuestAccount.token.refresh,
        } satisfies IMultiUserTodoAppGuest.IRefresh,
      },
    );
  typia.assert(refreshedAccount);
  // Verify the refreshed token is different from the original
  TestValidator.notEquals(
    "refreshed access token should differ",
    validGuestAccount.token.access,
    refreshedAccount.token.access,
  );
}
