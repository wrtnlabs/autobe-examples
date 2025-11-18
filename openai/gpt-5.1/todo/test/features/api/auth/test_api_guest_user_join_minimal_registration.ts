import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";

/**
 * Validate minimal guest user registration and token issuance.
 *
 * Business purpose:
 *
 * - Ensure that an anonymous visitor can create a guestUser concept via
 *   /auth/guestUser/join without providing any external_ref metadata.
 * - Confirm that the backend issues a valid ITodoAppGuestUser.IAuthorized payload
 *   with consistent token information and timestamps.
 * - Verify that repeated minimal joins yield distinct guest ids and independent
 *   token sets, ensuring proper UUID and token generation.
 *
 * Steps:
 *
 * 1. Perform a minimal join request with an empty body (no external_ref).
 * 2. Assert the response type with typia.assert and check key business rules
 *    around timestamps and token lifetimes.
 * 3. Perform a second minimal join request and confirm that ids and tokens do not
 *    collide with the first response.
 */
export async function test_api_guest_user_join_minimal_registration(
  connection: api.IConnection,
) {
  // 1. First minimal guest join with empty body
  const firstJoin = await api.functional.auth.guestUser.join(connection, {
    body: {},
  });
  typia.assert<ITodoAppGuestUser.IAuthorized>(firstJoin);

  // Validate convenience token mirrors when present
  TestValidator.equals(
    "accessToken mirrors token.access when present",
    firstJoin.accessToken ?? null,
    firstJoin.accessToken !== undefined ? firstJoin.token.access : null,
  );
  TestValidator.equals(
    "refreshToken mirrors token.refresh when present",
    firstJoin.refreshToken ?? null,
    firstJoin.refreshToken !== undefined ? firstJoin.token.refresh : null,
  );

  // external_ref should be undefined or null when not supplied
  TestValidator.predicate(
    "external_ref is undefined or null on minimal join",
    firstJoin.external_ref === undefined || firstJoin.external_ref === null,
  );

  // created_at and updated_at should be valid date-time strings and ordered logically
  const createdAtFirst = new Date(firstJoin.created_at);
  const updatedAtFirst = new Date(firstJoin.updated_at);
  TestValidator.predicate(
    "created_at is a valid date",
    !Number.isNaN(createdAtFirst.getTime()),
  );
  TestValidator.predicate(
    "updated_at is a valid date",
    !Number.isNaN(updatedAtFirst.getTime()),
  );
  TestValidator.predicate(
    "updated_at is not before created_at",
    updatedAtFirst.getTime() >= createdAtFirst.getTime(),
  );

  // Token lifetime checks
  const expiredAtFirst = new Date(firstJoin.token.expired_at);
  const refreshableUntilFirst = new Date(firstJoin.token.refreshable_until);
  const now = new Date();
  TestValidator.predicate(
    "expired_at is not in the past",
    expiredAtFirst.getTime() >= now.getTime(),
  );
  TestValidator.predicate(
    "refreshable_until is not before expired_at",
    refreshableUntilFirst.getTime() >= expiredAtFirst.getTime(),
  );

  // 2. Second minimal guest join
  const secondJoin = await api.functional.auth.guestUser.join(connection, {
    body: {},
  });
  typia.assert<ITodoAppGuestUser.IAuthorized>(secondJoin);

  // Ensure different guest ids
  TestValidator.notEquals(
    "second join yields a different guest id",
    firstJoin.id,
    secondJoin.id,
  );

  // Ensure different access tokens
  TestValidator.notEquals(
    "second join yields a different access token",
    firstJoin.token.access,
    secondJoin.token.access,
  );

  // Ensure different refresh tokens
  TestValidator.notEquals(
    "second join yields a different refresh token",
    firstJoin.token.refresh,
    secondJoin.token.refresh,
  );
}
