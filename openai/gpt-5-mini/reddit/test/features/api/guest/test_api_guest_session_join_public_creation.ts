import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalGuest";

/**
 * Validate public guest session creation (POST /auth/guest/join).
 *
 * Business purpose:
 *
 * - Allow unauthenticated visitors to obtain a short-lived guest credential
 *   (guest_token) recorded in community_portal_guests. This enables read-only
 *   or scoped interactions without full account registration.
 *
 * Test steps:
 *
 * 1. Call POST /auth/guest/join with an empty create body.
 * 2. Assert response type ICommunityPortalGuest.IAuthorized via typia.assert().
 * 3. Verify guest_token and token.access are present and non-empty.
 * 4. Verify created_at is recent (within tolerance) and expired_at (if present) is
 *    in the future.
 * 5. Ensure sensitive fields (e.g., password_hash) are not leaked in the response
 *    object.
 */
export async function test_api_guest_session_join_public_creation(
  connection: api.IConnection,
) {
  // 1) Prepare request body (ICreate is an empty object DTO)
  const body = {} satisfies ICommunityPortalGuest.ICreate;

  // 2) Call the API to create a guest session
  const guest: ICommunityPortalGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body,
    });

  // 3) Type validation — ensure response shape and formats are correct
  typia.assert(guest);

  // 4) Business assertions
  // guest_token must be non-empty
  TestValidator.predicate(
    "guest_token should be a non-empty string",
    typeof guest.guest_token === "string" && guest.guest_token.length > 0,
  );

  // id presence and format are covered by typia.assert; still assert non-empty
  TestValidator.predicate(
    "id should be present",
    typeof guest.id === "string" && guest.id.length > 0,
  );

  // created_at should be recent (tolerance: 5 minutes)
  const createdAt = Date.parse(guest.created_at);
  TestValidator.predicate(
    "created_at should be recent (within 5 minutes)",
    Number.isFinite(createdAt) && Date.now() - createdAt < 1000 * 60 * 5,
  );

  // expired_at, if provided, should be in the future
  if (guest.expired_at !== null && guest.expired_at !== undefined) {
    const exp = Date.parse(guest.expired_at);
    TestValidator.predicate(
      "expired_at should be in the future",
      Number.isFinite(exp) && exp > Date.now(),
    );
  }

  // token must exist and contain non-empty access token
  typia.assert(guest.token);
  TestValidator.predicate(
    "token.access should be a non-empty string",
    typeof guest.token.access === "string" && guest.token.access.length > 0,
  );

  // 5) Ensure no sensitive fields are leaked in the response
  // Use a record view to check property absence without inventing schema fields
  const guestRecord = guest as unknown as Record<string, unknown>;
  TestValidator.predicate(
    "response must not contain password_hash",
    !("password_hash" in guestRecord),
  );

  // NOTE: Optional: The SDK's join() implementation sets connection.headers.Authorization
  // to the returned token.access. If further read-only calls were available in
  // the provided SDK list, we could exercise them here to confirm the guest
  // credential is usable for read-only endpoints. No additional read-only
  // endpoints were provided in the input materials, so this test focuses on
  // validating the creation response itself.
}
