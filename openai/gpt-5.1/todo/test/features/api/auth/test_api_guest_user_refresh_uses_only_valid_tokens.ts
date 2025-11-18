import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppGuestUserMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserMetadata";

export async function test_api_guest_user_refresh_uses_only_valid_tokens(
  connection: api.IConnection,
) {
  // 1. Establish an authorized guest session and capture its refresh token.
  const joined = await api.functional.auth.guestUser.join(connection, {
    body: {
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppGuestUser.IJoin,
  });
  typia.assert<ITodoAppGuestUser.IAuthorized>(joined);

  const originalRefreshToken: string = joined.token.refresh;

  // 2. Use the original refresh token to obtain a new authorization payload.
  const firstRefreshed = await api.functional.auth.guestUser.refresh(
    connection,
    {
      body: {
        refresh_token: originalRefreshToken,
      } satisfies ITodoAppGuestUser.IRefresh,
    },
  );
  typia.assert<ITodoAppGuestUser.IAuthorized>(firstRefreshed);

  // Sanity checks: new tokens should differ from the original ones to reflect rotation.
  TestValidator.notEquals(
    "refreshed token.refresh must differ from original",
    firstRefreshed.token.refresh,
    originalRefreshToken,
  );
  TestValidator.notEquals(
    "refreshed token.access must differ from original access token",
    firstRefreshed.token.access,
    joined.token.access,
  );

  // 3. Verify that reusing the old refresh token fails.
  await TestValidator.error("old refresh token cannot be reused", async () => {
    await api.functional.auth.guestUser.refresh(connection, {
      body: {
        refresh_token: originalRefreshToken,
      } satisfies ITodoAppGuestUser.IRefresh,
    });
  });

  // 4. Optionally, ensure that the latest refresh token continues to work.
  const secondRefreshed = await api.functional.auth.guestUser.refresh(
    connection,
    {
      body: {
        refresh_token: firstRefreshed.token.refresh,
      } satisfies ITodoAppGuestUser.IRefresh,
    },
  );
  typia.assert<ITodoAppGuestUser.IAuthorized>(secondRefreshed);

  TestValidator.notEquals(
    "second refresh should rotate refresh token again",
    secondRefreshed.token.refresh,
    firstRefreshed.token.refresh,
  );
}
