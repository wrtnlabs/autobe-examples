import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IClientContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IClientContext";
import type { ITodoListGuestVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuestVisitor";

/**
 * Validate guest token refresh success path.
 *
 * Business context:
 *
 * - A guest actor joins to receive initial JWT tokens.
 * - The refresh endpoint exchanges a valid refresh token for a new access token
 *   (and possibly a rotated refresh token) while preserving actor identity.
 *
 * Test flow:
 *
 * 1. Call POST /auth/guestVisitor/join with an empty create body to obtain
 *    ITodoListGuestVisitor.IAuthorized (initial tokens and identity).
 * 2. Call POST /auth/guestVisitor/refresh with the previously received refresh
 *    token and a minimal IClientContext.
 * 3. Validate:
 *
 *    - Response types match schemas (typia.assert)
 *    - Actor id remains the same
 *    - Created_at remains the same
 *    - Updated_at does not go backwards
 *    - Access token is rotated (new access token differs from the old one)
 *    - If guestVisitor snapshot exists in response, its identity mirrors top-level
 *         identity
 */
export async function test_api_guest_visitor_token_refresh_success(
  connection: api.IConnection,
) {
  // 1) Join as guest to obtain initial tokens
  const joinBody = {
    // Intentionally minimal per ICreate definition
  } satisfies ITodoListGuestVisitor.ICreate;
  const initial = await api.functional.auth.guestVisitor.join(connection, {
    body: joinBody,
  });
  typia.assert(initial);

  // Stash initial tokens and timestamps
  const initialAccess: string = initial.token.access;
  const initialRefresh: string = initial.token.refresh;
  const initialCreatedAt: string = initial.created_at;
  const initialUpdatedAt: string = initial.updated_at;

  // 2) Refresh using the obtained refresh token with an optional client context
  const refreshBody = {
    refreshToken: initialRefresh,
    client: {
      deviceId: `e2e-${RandomGenerator.alphaNumeric(12)}`,
      userAgent: `e2e/${RandomGenerator.alphabets(6)}`,
      ip: "127.0.0.1",
    },
  } satisfies ITodoListGuestVisitor.IRefresh;
  const refreshed = await api.functional.auth.guestVisitor.refresh(connection, {
    body: refreshBody,
  });
  typia.assert(refreshed);

  // 3) Business validations
  // Identity persistence
  TestValidator.equals(
    "actor id remains the same after refresh",
    refreshed.id,
    initial.id,
  );
  TestValidator.equals(
    "created_at remains stable after refresh",
    refreshed.created_at,
    initialCreatedAt,
  );

  // updated_at should not move backwards
  const prevUpdated = Date.parse(initialUpdatedAt);
  const nextUpdated = Date.parse(refreshed.updated_at);
  TestValidator.predicate(
    "updated_at is not earlier than previous value",
    nextUpdated >= prevUpdated,
  );

  // Access token should be rotated
  TestValidator.notEquals(
    "access token is rotated on refresh",
    refreshed.token.access,
    initialAccess,
  );

  // Optional embedded identity should mirror top-level values when present
  if (refreshed.guestVisitor !== undefined && refreshed.guestVisitor !== null) {
    typia.assertGuard<ITodoListGuestVisitor>(refreshed.guestVisitor!);
    TestValidator.equals(
      "embedded guestVisitor.id equals top-level id",
      refreshed.guestVisitor.id,
      refreshed.id,
    );
    TestValidator.equals(
      "embedded created_at mirrors top-level created_at",
      refreshed.guestVisitor.created_at,
      refreshed.created_at,
    );
    TestValidator.equals(
      "embedded updated_at mirrors top-level updated_at",
      refreshed.guestVisitor.updated_at,
      refreshed.updated_at,
    );
  }
}
