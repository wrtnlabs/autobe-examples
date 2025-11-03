import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";

/**
 * Validate guest join flow (temporary guest identity issuance).
 *
 * This test calls the public guest-join endpoint via the generated SDK function
 * `api.functional.auth.guest.join(connection)`. Note: the original scenario
 * mentioned an optional request body field (anonymousLabel). The provided SDK
 * function does not accept a request body, so this test exercises the actual
 * available API surface and validates the returned authorization payload
 * (IAuthorized).
 *
 * Steps:
 *
 * 1. Call guest join endpoint (no request body supported by SDK)
 * 2. Typia.assert the returned IAuthorized payload (full schema validation)
 * 3. Business assertions using TestValidator for non-empty tokens and basic
 *    consistency checks
 * 4. Persist accessToken, refreshToken, and guestId into local constants for
 *    potential downstream usage
 */
export async function test_api_guest_join_create_temporary_guest(
  connection: api.IConnection,
) {
  // 1) Call the guest join endpoint (public, no request body in SDK)
  const output: ITodoAppGuest.IAuthorized =
    await api.functional.auth.guest.join(connection);

  // 2) Full type validation (validates uuid and date-time formats too)
  typia.assert(output);

  // 3) Business assertions: tokens are present and non-empty strings
  TestValidator.predicate(
    "access token should be a non-empty string",
    typeof output.token.access === "string" && output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be a non-empty string",
    typeof output.token.refresh === "string" && output.token.refresh.length > 0,
  );

  // 4) Token timestamps presence (typia.assert guarantees types; these are business-level presence checks)
  TestValidator.predicate(
    "token.expired_at present",
    typeof output.token.expired_at === "string" &&
      output.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token.refreshable_until present",
    typeof output.token.refreshable_until === "string" &&
      output.token.refreshable_until.length > 0,
  );

  // 5) Guest metadata consistency
  if (output.guest !== undefined && output.guest !== null) {
    // Nested guest must also match its DTO
    typia.assert(output.guest);
    TestValidator.equals(
      "top-level id matches nested guest.id",
      output.id,
      output.guest.id,
    );
  }

  // 6) Persist returned tokens and id for dependent scenarios
  const accessToken: string = output.token.access;
  const refreshToken: string = output.token.refresh;
  const guestId: string = output.id;

  // 7) Simple non-empty sanity checks (business assertions)
  TestValidator.predicate("accessToken non-empty", accessToken.length > 0);
  TestValidator.predicate("refreshToken non-empty", refreshToken.length > 0);
  TestValidator.predicate("guestId non-empty", guestId.length > 0);
}
