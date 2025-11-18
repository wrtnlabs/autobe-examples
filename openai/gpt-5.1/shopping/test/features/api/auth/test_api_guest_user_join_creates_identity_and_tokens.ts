import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";

/**
 * Validate that guest user join creates a new logical guest identity and
 * returns usable JWT tokens without prior authentication.
 *
 * Business context:
 *
 * - Guests represent unauthenticated visitors that can still own carts or other
 *   transient data.
 * - /auth/guestUser/join is a public "join" endpoint that inserts a row into
 *   shopping_mall_guestusers and issues an authorization payload for the
 *   guestUser actor.
 *
 * Test flow:
 *
 * 1. Build a realistic IShoppingMallGuestUser.IJoin request body using a pseudo
 *    device or cookie identifier as external_reference.
 * 2. Call api.functional.auth.guestUser.join(connection, { body }) on a fresh
 *    connection instance that has no Authorization header preset.
 * 3. Assert that the response conforms to IShoppingMallGuestUser.IAuthorized via
 *    typia.assert.
 * 4. Validate identity fields:
 *
 *    - External_reference, when provided in the request, is echoed back.
 *    - Created_at and updated_at respect created_at <= updated_at (temporal logic).
 *    - Deleted_at is either undefined or null for a freshly created guest.
 * 5. Validate token fields (IAuthorizationToken):
 *
 *    - Token.access and token.refresh are non-empty strings.
 *    - Token.expired_at and token.refreshable_until represent instants in the future
 *         relative to `now`.
 * 6. Optionally examine convenience / projection fields when present:
 *
 *    - CreatedAt, lastActiveAt are treated as informational timestamps.
 *    - HasCarts and hasOrders, when defined, should be false for a new guest.
 *    - RiskFlagCount and maxRiskSeverity, when defined, should be 0 for a new guest.
 *    - HasRecentSecurityEvents, when defined, should be false.
 *
 * The test does not inspect the underlying database, but relies on the
 * documented DTO contracts and basic temporal/business invariants.
 */
export async function test_api_guest_user_join_creates_identity_and_tokens(
  connection: api.IConnection,
) {
  // Build a fresh, unauthenticated connection (no Authorization header).
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // 1. Construct join payload with a realistic external reference.
  const externalReference: string = `device-${RandomGenerator.alphaNumeric(16)}`;
  const joinBody = {
    external_reference: externalReference,
  } satisfies IShoppingMallGuestUser.IJoin;

  // 2. Call public guestUser join endpoint.
  const authorized: IShoppingMallGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(unauthConnection, {
      body: joinBody,
    });

  // 3. Structural assertion for strong type guarantees.
  typia.assert(authorized);

  // 4. Identity field validations.
  TestValidator.equals(
    "external_reference should echo the requested value when provided",
    authorized.external_reference ?? undefined,
    externalReference,
  );

  // created_at and updated_at: temporal ordering (typia.assert already
  // guarantees they are valid ISO date-time strings).
  const createdAtDate: Date = new Date(authorized.created_at);
  const updatedAtDate: Date = new Date(authorized.updated_at);

  TestValidator.predicate(
    "created_at should not be after updated_at",
    createdAtDate.getTime() <= updatedAtDate.getTime(),
  );

  // deleted_at must be null or undefined for a newly created guest identity.
  TestValidator.predicate(
    "deleted_at should be null or undefined on creation",
    authorized.deleted_at === null || authorized.deleted_at === undefined,
  );

  // 5. Token field validations (business logic, not type/format checks).
  const token: IAuthorizationToken = authorized.token;
  TestValidator.predicate(
    "access token must be non-empty",
    token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token must be non-empty",
    token.refresh.length > 0,
  );

  const now: number = Date.now();
  const expiredAtDate: Date = new Date(token.expired_at);
  const refreshableUntilDate: Date = new Date(token.refreshable_until);

  TestValidator.predicate(
    "expired_at should be in the future",
    expiredAtDate.getTime() > now,
  );
  TestValidator.predicate(
    "refreshable_until should be in the future",
    refreshableUntilDate.getTime() > now,
  );

  // 6. Optional convenience / projection fields.
  if (authorized.hasCarts !== undefined) {
    TestValidator.predicate(
      "hasCarts should be false for a new guest when defined",
      authorized.hasCarts === false,
    );
  }
  if (authorized.hasOrders !== undefined) {
    TestValidator.predicate(
      "hasOrders should be false for a new guest when defined",
      authorized.hasOrders === false,
    );
  }
  if (authorized.riskFlagCount !== undefined) {
    TestValidator.predicate(
      "riskFlagCount should be zero for a new guest when defined",
      authorized.riskFlagCount === 0,
    );
  }
  if (authorized.maxRiskSeverity !== undefined) {
    TestValidator.predicate(
      "maxRiskSeverity should be zero for a new guest when defined",
      authorized.maxRiskSeverity === 0,
    );
  }
  if (authorized.hasRecentSecurityEvents !== undefined) {
    TestValidator.predicate(
      "hasRecentSecurityEvents should be false for a new guest when defined",
      authorized.hasRecentSecurityEvents === false,
    );
  }
}
