import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

/**
 * Test that POST /auth/registeredUser/sessions/revoke-all rejects
 * unauthenticated requests.
 *
 * Purpose:
 *
 * - Ensure the revoke-all-sessions endpoint correctly enforces registeredUser
 *   authorization and does not allow unauthenticated callers to invalidate
 *   sessions.
 *
 * Notes:
 *
 * - The SDK exposes
 *   api.functional.auth.registeredUser.sessions.revoke_all.revokeAllSessions.
 * - This test intentionally uses an unauthenticated connection by creating a
 *   shallow copy of the provided connection with headers: {}. Per testing
 *   guidelines, do not read or modify connection.headers beyond this creation.
 * - There is no SDK function available to list sessions or inspect the sessions
 *   table; therefore this test focuses on authorization enforcement (HTTP
 *   401/403). Verifying DB side-effects requires additional endpoints or DB
 *   inspection utilities not available in the provided materials.
 */
export async function test_api_registereduser_revoke_all_sessions_unauthenticated_fails(
  connection: api.IConnection,
) {
  // Create an unauthenticated connection (allowed pattern per guidelines).
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Expect an authorization HTTP error (401 Unauthorized or 403 Forbidden).
  await TestValidator.httpError(
    "unauthenticated revoke-all should be rejected with 401 or 403",
    [401, 403],
    async () => {
      await api.functional.auth.registeredUser.sessions.revoke_all.revokeAllSessions(
        unauthConn,
      );
    },
  );
}
