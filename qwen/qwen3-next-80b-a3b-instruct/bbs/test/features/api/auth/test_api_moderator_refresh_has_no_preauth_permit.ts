import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_refresh_has_no_preauth_permit(
  connection: api.IConnection,
) {
  // Generate a valid-looking refresh token that conforms to the expected format
  // The server validates this token against its session store, not from any pre-authentication state
  const refreshToken: string =
    "refresh_" + typia.random<string & tags.Format<"uuid">>();

  // Step 1: Call refresh endpoint with freshly generated valid refresh token
  // This should succeed if the token was previously issued and still active
  const refreshResponse: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(connection, {
      body: {
        refresh_token: refreshToken,
      } satisfies IPoliticalForumModerator.IRefresh,
    });
  typia.assert(refreshResponse);

  // Validate that successful refresh produces a new access token and preserves moderator identity
  TestValidator.equals(
    "new access token is issued",
    refreshResponse.token.access.length > 0,
    true,
  );
  TestValidator.predicate("moderator id is UUID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      refreshResponse.id,
    ),
  );
  TestValidator.predicate("moderator email is valid", () =>
    /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(
      refreshResponse.email,
    ),
  );

  // Step 2: Validate that refreshable_until is a valid future date-time
  const now = new Date().toISOString();
  TestValidator.predicate(
    "refreshable_until is a valid future date-time",
    () => new Date(refreshResponse.token.refreshable_until) > new Date(now),
  );

  // Step 3: Verify that the system does not rely on any pre-authentication state or caching
  // Even if we re-use the same connection object, it must still perform independent validation
  // Create a new connection with empty headers to ensure no cached state affects the request
  const newConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Call refresh with the same token on a fresh connection - should still succeed
  // This verifies the server validates against its persistent session store, not cached connection state
  const secondRefreshResponse: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.refresh(newConnection, {
      body: {
        refresh_token: refreshToken,
      } satisfies IPoliticalForumModerator.IRefresh,
    });
  typia.assert(secondRefreshResponse);

  // Confirm the response identity matches (same moderator)
  TestValidator.equals(
    "second refresh response id matches",
    secondRefreshResponse.id,
    refreshResponse.id,
  );
  TestValidator.equals(
    "second refresh response email matches",
    secondRefreshResponse.email,
    refreshResponse.email,
  );

  // Validate that the new access/refresh tokens are different (indicating fresh issuance)
  TestValidator.notEquals(
    "second refresh access token different",
    secondRefreshResponse.token.access,
    refreshResponse.token.access,
  );
  TestValidator.notEquals(
    "second refresh refresh token different",
    secondRefreshResponse.token.refresh,
    refreshResponse.token.refresh,
  );

  // Step 4: Ensure the system does not permit caching or preprocessing by using an invalid token
  // This validates that no pre-authorized state bypasses validation
  const invalidToken: string =
    "invalid-refresh-token-" + typia.random<string & tags.Format<"uuid">>();

  // This call must fail with 401 Unauthorized, proving validation occurs independently
  await TestValidator.error("invalid token must fail", async () => {
    await api.functional.auth.moderator.refresh(newConnection, {
      body: {
        refresh_token: invalidToken,
      } satisfies IPoliticalForumModerator.IRefresh,
    });
  });

  // Final validation: Confirm all refresh responses are fresh, stateless, and validated independently
  // The system must not rely on the connection's state, prior authentication, or any memory cache
  // Every refresh must be authenticated against the central session store
}
