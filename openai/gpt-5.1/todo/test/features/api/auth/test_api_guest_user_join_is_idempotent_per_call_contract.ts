import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppGuestUserMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserMetadata";

/**
 * Validate idempotent-per-call behavior of guest user join endpoint.
 *
 * Business goal: Ensure that clients can safely call POST /auth/guestUser/join
 * multiple times from the same unauthenticated context and always receive a
 * fully usable guest authorization payload, regardless of whether the backend
 * creates a new guest row or reuses an existing one.
 *
 * What this test checks:
 *
 * 1. Each call to api.functional.auth.guestUser.join returns a structurally valid
 *    ITodoAppGuestUser.IAuthorized object.
 * 2. The guest identity in each response is active (deleted_at is null or
 *    undefined), meaning the backend does not issue tokens for logically
 *    deleted identities.
 * 3. The embedded IAuthorizationToken object has non-empty access and refresh
 *    tokens, and a refreshable_until that is not earlier than expired_at.
 * 4. The test intentionally does NOT assert whether ids or token values from
 *    consecutive calls are equal or different; this is an implementation detail
 *    left to the backend (create or reuse, rotate tokens, etc.).
 *
 * High-level steps:
 *
 * 1. Build a minimal yet valid ITodoAppGuestUser.IJoin request body, including an
 *    optional display_name.
 * 2. Call api.functional.auth.guestUser.join(connection, { body }) to obtain the
 *    first ITodoAppGuestUser.IAuthorized payload (authA).
 * 3. Call the same join endpoint again on the same connection, using a variant
 *    body (e.g., omitting display_name) to get authB.
 * 4. For each of authA and authB:
 *
 *    - Validate structural correctness using typia.assert.
 *    - Assert deleted_at is null or undefined.
 *    - Assert token.access and token.refresh are non-empty strings.
 *    - Assert token.refreshable_until is not before token.expired_at.
 */
export async function test_api_guest_user_join_is_idempotent_per_call_contract(
  connection: api.IConnection,
) {
  // 1. Prepare request bodies for two join calls.
  const joinBodyA = {
    display_name: RandomGenerator.name(2),
  } satisfies ITodoAppGuestUser.IJoin;

  const joinBodyB = {
    // Second call intentionally omits display_name to exercise optionality.
  } satisfies ITodoAppGuestUser.IJoin;

  // 2. First join call
  const authA: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: joinBodyA,
    });
  typia.assert<ITodoAppGuestUser.IAuthorized>(authA);

  // 3. Second join call on same connection
  const authB: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: joinBodyB,
    });
  typia.assert<ITodoAppGuestUser.IAuthorized>(authB);

  const assertAuthorizedPayload = (
    title: string,
    payload: ITodoAppGuestUser.IAuthorized,
  ) => {
    // deleted_at must indicate active identity: null or undefined
    TestValidator.predicate(
      `${title} deleted_at must be null or undefined (active identity)`,
      payload.deleted_at === null || payload.deleted_at === undefined,
    );

    const token: IAuthorizationToken = payload.token;

    // access and refresh tokens must be non-empty strings (business rule)
    TestValidator.predicate(
      `${title} token.access must be non-empty`,
      token.access.length > 0,
    );
    TestValidator.predicate(
      `${title} token.refresh must be non-empty`,
      token.refresh.length > 0,
    );

    // Compare temporal ordering between expired_at and refreshable_until.
    // typia.assert has already guaranteed both are valid date-time strings.
    const expiredAt = new Date(token.expired_at);
    const refreshableUntil = new Date(token.refreshable_until);

    TestValidator.predicate(
      `${title} token.refreshable_until should not be before expired_at`,
      refreshableUntil.getTime() >= expiredAt.getTime(),
    );
  };

  // 4. Validate both authorization payloads independently
  assertAuthorizedPayload("first join", authA);
  assertAuthorizedPayload("second join", authB);

  // 5. Sanity check: both calls succeeded and produced usable identities.
  // We do NOT assert equality/inequality of ids or tokens.
  TestValidator.predicate(
    "both join calls should produce usable guest identities",
    authA.id.length > 0 && authB.id.length > 0,
  );
}
