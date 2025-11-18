import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";

/**
 * Validate guest user join without external correlation reference.
 *
 * Business intent:
 *
 * - Ensure that POST /auth/guestUser/join correctly creates a logical guest
 *   identity when the client does not provide any external correlation
 *   identifier.
 * - Confirm that the response payload conforms to
 *   IShoppingMallGuestUser.IAuthorized and that all key projections reflect a
 *   freshly created, risk-free guest identity with no carts or orders yet.
 *
 * Scenario steps:
 *
 * 1. Call guestUser join with an empty IShoppingMallGuestUser.IJoin body (omitting
 *    external_reference entirely).
 * 2. Validate that the response is a structurally correct
 *    IShoppingMallGuestUser.IAuthorized.
 * 3. Verify that external_reference is not a non-empty string (it should be
 *    undefined or null since we did not send it).
 * 4. Verify that created_at and updated_at are non-empty ISO date-time strings.
 * 5. Verify that token fields (access, refresh, expired_at, refreshable_until) are
 *    present and non-empty.
 * 6. Optionally, perform a second join call and confirm that the two guest
 *    identities have different ids.
 * 7. Optionally, assert that projection fields like hasCarts, hasOrders,
 *    riskFlagCount, maxRiskSeverity, and hasRecentSecurityEvents, when present,
 *    represent a "no activity" state (false/0) for a brand-new guest.
 */
export async function test_api_guest_user_join_without_external_reference(
  connection: api.IConnection,
) {
  // 1. Call guestUser join without external_reference
  const firstJoinResponse = await api.functional.auth.guestUser.join(
    connection,
    {
      body: {},
    },
  );

  // Validate structural type of the response
  typia.assert<IShoppingMallGuestUser.IAuthorized>(firstJoinResponse);

  // 2. Basic business validations on the first response
  TestValidator.predicate(
    "guest id should be a non-empty UUID string",
    typeof firstJoinResponse.id === "string" && firstJoinResponse.id.length > 0,
  );

  // external_reference should not be a non-empty string when we did not send it
  TestValidator.predicate(
    "external_reference should be undefined, null, or an empty string",
    firstJoinResponse.external_reference === undefined ||
      firstJoinResponse.external_reference === null ||
      (typeof firstJoinResponse.external_reference === "string" &&
        firstJoinResponse.external_reference.length === 0),
  );

  // created_at and updated_at must be non-empty strings (typia has already
  // ensured they are ISO date-time strings)
  TestValidator.predicate(
    "created_at should be a non-empty string",
    typeof firstJoinResponse.created_at === "string" &&
      firstJoinResponse.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be a non-empty string",
    typeof firstJoinResponse.updated_at === "string" &&
      firstJoinResponse.updated_at.length > 0,
  );

  // Token presence and basic sanity
  TestValidator.predicate(
    "token.access should be a non-empty string",
    typeof firstJoinResponse.token.access === "string" &&
      firstJoinResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh should be a non-empty string",
    typeof firstJoinResponse.token.refresh === "string" &&
      firstJoinResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at should be a non-empty string",
    typeof firstJoinResponse.token.expired_at === "string" &&
      firstJoinResponse.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token.refreshable_until should be a non-empty string",
    typeof firstJoinResponse.token.refreshable_until === "string" &&
      firstJoinResponse.token.refreshable_until.length > 0,
  );

  // Derived projections for a brand-new guest identity: if present, they
  // should represent a "no data yet" state
  if (firstJoinResponse.hasCarts !== undefined) {
    TestValidator.predicate(
      "hasCarts should be false or undefined for a new guest",
      firstJoinResponse.hasCarts === false,
    );
  }
  if (firstJoinResponse.hasOrders !== undefined) {
    TestValidator.predicate(
      "hasOrders should be false or undefined for a new guest",
      firstJoinResponse.hasOrders === false,
    );
  }
  if (firstJoinResponse.riskFlagCount !== undefined) {
    TestValidator.predicate(
      "riskFlagCount should be zero or undefined for a new guest",
      firstJoinResponse.riskFlagCount === 0,
    );
  }
  if (firstJoinResponse.maxRiskSeverity !== undefined) {
    TestValidator.predicate(
      "maxRiskSeverity should be zero or undefined for a new guest",
      firstJoinResponse.maxRiskSeverity === 0,
    );
  }
  if (firstJoinResponse.hasRecentSecurityEvents !== undefined) {
    TestValidator.predicate(
      "hasRecentSecurityEvents should be false or undefined for a new guest",
      firstJoinResponse.hasRecentSecurityEvents === false,
    );
  }

  // 3. Perform a second join call to verify uniqueness of guest ids
  const secondJoinResponse = await api.functional.auth.guestUser.join(
    connection,
    {
      body: {},
    },
  );
  typia.assert<IShoppingMallGuestUser.IAuthorized>(secondJoinResponse);

  TestValidator.predicate(
    "each guest join call should produce a distinct id",
    firstJoinResponse.id !== secondJoinResponse.id,
  );
}
