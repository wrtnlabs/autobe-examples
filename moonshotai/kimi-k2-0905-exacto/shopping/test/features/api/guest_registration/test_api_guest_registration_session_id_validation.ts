import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";

/**
 * Test guest registration with session ID validation edge cases.
 *
 * This test validates the guest registration endpoint's session ID validation
 * mechanisms by testing boundary conditions including minimum length (10
 * chars), maximum length (64 chars), and invalid lengths outside these ranges.
 *
 * Test scenarios:
 *
 * 1. Normal session ID registration (valid length)
 * 2. Session ID at minimum boundary (exactly 10 characters)
 * 3. Session ID at maximum boundary (exactly 64 characters)
 * 4. Invalid session IDs (under minimum and over maximum length)
 * 5. Edge case validation around the boundaries
 *
 * The test ensures proper validation behavior for both valid and invalid
 * session identifiers, maintaining platform security and data integrity while
 * providing appropriate error responses for constraint violations.
 */
export async function test_api_guest_registration_session_id_validation(
  connection: api.IConnection,
) {
  // Generate valid baseline guest registration data
  const baseTime = new Date().toISOString();
  const baseGuestData = {
    href: "https://example.com/products",
    referrer: "https://google.com/search",
    user_agent: RandomGenerator.alphabets(20),
    last_activity_at: baseTime,
    created_at: baseTime,
    updated_at: baseTime,
  } satisfies Partial<IShoppingMallGuest.ICreate>;

  // Test 1: Normal registration with valid session ID (within bounds)
  const validSessionId = typia.random<
    string & tags.MinLength<10> & tags.MaxLength<64>
  >();
  const validGuest: IShoppingMallGuest.ICreate = {
    ...baseGuestData,
    session_id: validSessionId,
  } satisfies IShoppingMallGuest.ICreate;

  const authorizedGuest = await api.functional.auth.guest.join(connection, {
    body: validGuest,
  });
  typia.assert(authorizedGuest);

  TestValidator.predicate(
    "valid session ID registration succeeds",
    authorizedGuest.session_id === validSessionId,
  );

  // Test 2: Session ID at minimum boundary (exactly 10 characters)
  const minBoundaryId = RandomGenerator.alphabets(10);
  const minBoundaryGuest: IShoppingMallGuest.ICreate = {
    ...baseGuestData,
    session_id: minBoundaryId,
  } satisfies IShoppingMallGuest.ICreate;

  const minGuest = await api.functional.auth.guest.join(connection, {
    body: minBoundaryGuest,
  });
  typia.assert(minGuest);

  TestValidator.equals(
    "minimum boundary 10 character session ID works",
    minGuest.session_id,
    minBoundaryId,
  );

  // Test 3: Session ID at maximum boundary (exactly 64 characters)
  const maxBoundaryId = RandomGenerator.alphaNumeric(64);
  const maxBoundaryGuest: IShoppingMallGuest.ICreate = {
    ...baseGuestData,
    session_id: maxBoundaryId,
  } satisfies IShoppingMallGuest.ICreate;

  const maxGuest = await api.functional.auth.guest.join(connection, {
    body: maxBoundaryGuest,
  });
  typia.assert(maxGuest);

  TestValidator.equals(
    "maximum boundary 64 character session ID works",
    maxGuest.session_id,
    maxBoundaryId,
  );

  // Test 4: Invalid session ID (under minimum length)
  const tooShortId = RandomGenerator.alphabets(9);
  const invalidMinGuest: IShoppingMallGuest.ICreate = {
    ...baseGuestData,
    session_id: tooShortId,
  } satisfies IShoppingMallGuest.ICreate;

  // This should fail due to validation constraints
  await TestValidator.error(
    "session ID under minimum length 10 should fail",
    async () => {
      await api.functional.auth.guest.join(connection, {
        body: invalidMinGuest,
      });
    },
  );

  // Test 5: Invalid session ID (over maximum length)
  const tooLongId = RandomGenerator.alphaNumeric(65);
  const invalidMaxGuest: IShoppingMallGuest.ICreate = {
    ...baseGuestData,
    session_id: tooLongId,
  } satisfies IShoppingMallGuest.ICreate;

  // This should also fail due to validation constraints
  await TestValidator.error(
    "session ID over maximum length 64 should fail",
    async () => {
      await api.functional.auth.guest.join(connection, {
        body: invalidMaxGuest,
      });
    },
  );

  // Test 6: Edge case - session ID exactly at boundary (translation verification)
  const tenCharId = ArrayUtil.repeat(10, () =>
    RandomGenerator.pick([..."abcdefghijklmnopqrstuvwxyz0123456789"] as const),
  ).join("");
  const boundaryTestGuest: IShoppingMallGuest.ICreate = {
    ...baseGuestData,
    session_id: tenCharId,
  } satisfies IShoppingMallGuest.ICreate;

  const boundaryGuest = await api.functional.auth.guest.join(connection, {
    body: boundaryTestGuest,
  });
  typia.assert(boundaryGuest);

  TestValidator.predicate(
    "exactly 10 character session ID should be accepted",
    boundaryGuest.session_id === tenCharId,
  );
}
