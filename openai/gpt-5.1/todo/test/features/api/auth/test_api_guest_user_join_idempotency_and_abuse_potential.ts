import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";

/**
 * Validate guestUser join idempotency and abuse characteristics.
 *
 * Business goal:
 *
 * - Repeatedly call POST /auth/guestUser/join with the same external_ref and
 *   verify that:
 *
 *   - Each call succeeds and returns a structurally valid
 *       ITodoAppGuestUser.IAuthorized payload.
 *   - The external_ref echo in the response is consistent with the provided value
 *       when present.
 *   - Multiple calls issue distinct guest ids and token sets, i.e., the operation
 *       behaves as a non-idempotent "create" by external_ref.
 *   - No validation errors occur solely because the same external_ref is reused
 *       across calls.
 *
 * Test outline:
 *
 * 1. Define a stable external_ref string identifying a logical client/device.
 * 2. Call api.functional.auth.guestUser.join 5 times in a loop with the same
 *    external_ref in the body.
 * 3. For each response, assert type correctness and basic invariants.
 * 4. After the loop, compare responses cross-call to ensure ids and token values
 *    differ and that the external_ref echo is consistent.
 */
export async function test_api_guest_user_join_idempotency_and_abuse_potential(
  connection: api.IConnection,
) {
  // 1. Stable external_ref for all join calls
  const externalRef = "client-xyz-device-001";

  // 2. Execute multiple join calls sequentially with the same external_ref
  const iterations = 5;
  const outputs: ITodoAppGuestUser.IAuthorized[] = [];

  for (let i = 0; i < iterations; ++i) {
    const output = await api.functional.auth.guestUser.join(connection, {
      body: {
        external_ref: externalRef,
      } satisfies ITodoAppGuestUser.IJoinRequest,
    });
    typia.assert<ITodoAppGuestUser.IAuthorized>(output);
    outputs.push(output);
  }

  // 3. Per-response validation
  for (let i = 0; i < outputs.length; ++i) {
    const out = outputs[i];

    // Ensure created_at and updated_at are valid date-time strings via typia.assert (already done),
    // here we just do basic logical predicates if desired.
    TestValidator.predicate(
      `guest[${i}] id should be non-empty`,
      typeof out.id === "string" && out.id.length > 0,
    );

    // external_ref is optional string | null | undefined. If backend echoes it,
    // ensure match. If backend stores null/undefined instead, allow that but
    // ensure stability across calls.
    if (out.external_ref !== null && out.external_ref !== undefined) {
      TestValidator.equals(
        `guest[${i}] external_ref should equal request value when present`,
        out.external_ref,
        externalRef,
      );
    }

    // Top-level accessToken/refreshToken are optional, but token.access/refresh
    // must be present per IAuthorizationToken.
    TestValidator.predicate(
      `guest[${i}] token.access should be non-empty string`,
      typeof out.token.access === "string" && out.token.access.length > 0,
    );
    TestValidator.predicate(
      `guest[${i}] token.refresh should be non-empty string`,
      typeof out.token.refresh === "string" && out.token.refresh.length > 0,
    );
  }

  // 4. Cross-call uniqueness checks
  const ids = outputs.map((o) => o.id);
  const accessTokens = outputs.map((o) => o.token.access);
  const refreshTokens = outputs.map((o) => o.token.refresh);

  const uniqueIds = new Set(ids);
  const uniqueAccessTokens = new Set(accessTokens);
  const uniqueRefreshTokens = new Set(refreshTokens);

  TestValidator.equals(
    "all guest join calls should return the same count as outputs",
    outputs.length,
    iterations,
  );

  // Expectation: each join call creates a distinct guest id.
  TestValidator.equals(
    "guest ids should be unique across repeated joins",
    uniqueIds.size,
    ids.length,
  );

  // Token sets should also be unique; at minimum access tokens should differ.
  TestValidator.equals(
    "access tokens should be unique across repeated joins",
    uniqueAccessTokens.size,
    accessTokens.length,
  );

  TestValidator.equals(
    "refresh tokens should be unique across repeated joins",
    uniqueRefreshTokens.size,
    refreshTokens.length,
  );
}
