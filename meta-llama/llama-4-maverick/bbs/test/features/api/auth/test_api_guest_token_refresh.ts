import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

export async function test_api_guest_token_refresh(
  connection: api.IConnection,
) {
  // Create a new guest account
  const guest: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: typia.random<IDiscussionBoardGuest.ICreate>(),
    });
  typia.assert(guest);

  // Refresh the guest token
  const refreshed: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection);
  typia.assert(refreshed);

  // Validate that refresh token remains the same
  TestValidator.equals(
    "token.refresh",
    refreshed.token.refresh,
    guest.token.refresh,
  );
  // Validate that access token is rotated
  TestValidator.notEquals(
    "token.access",
    refreshed.token.access,
    guest.token.access,
  );
  // Validate that new token has valid expiration time
  TestValidator.predicate("expiresIn", refreshed.expiresIn > 0);
}
